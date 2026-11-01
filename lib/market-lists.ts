import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { after } from "next/server";
import { TIER_LIMITS } from "./access";
import { db } from "./db";
import { scrapeCmcMostViewed } from "./scrapers/cmc";
import { scrapePluangExplore, type ExploreResult } from "./scrapers/pluang-explore";
import {
  LIST_DEFS,
  MARKETS,
  MARKET_CCY,
  safeIconUrl,
  type ListDef,
  type Market,
  type MarketItem,
  type OverviewItem,
  type WatchItem,
  type WatchMarket,
} from "./shared";

/**
 * Daftar pasar (naik, turun, terbesar, terpopuler, ringkasan pasar) disimpan di tabel market_lists.
 * Pembacaan selalu dari database. Bila datanya lebih tua dari `maxAgeMs`, data lama tetap ditampilkan
 * dan pembaruan berjalan di belakang. Bila belum ada data sama sekali, pembaca menunggu scraper
 * sebentar (`waitMs`). Kunci di market_list_state mencegah banyak pengguna men scrape bersamaan.
 */

export const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;
/** Data pasar bersifat publik dan sama untuk semua pengguna, jadi aman disimpan di cache bersama. Jangan pernah memasukkan data per pengguna ke cache ini. */
const MARKET_TAG = "market-lists";
const CACHE_SECONDS = 5 * 60;
const LOCK_SECONDS = 25;
const FAILURE_BACKOFF_SECONDS = 120;

/** Daftar yang benar benar di scrape (turunan seperti Naik crypto memakai sumber yang sama). */
export function sourceLists(market: Market): string[] {
  return [...new Set(LIST_DEFS[market].map((d) => d.from))];
}

/** Pembaruan ringkasan pasar ikut saat daftar utama pasar itu di scrape. */
const OVERVIEW_OWNER: Record<Market, string> = { idx: "gainers", us: "gainers", crypto: "viewed" };

const stateKey = (market: string, list: string) => `${market}:${list}`;

/* ============================================================
 * Scrape dan simpan
 * ============================================================ */

/** Scraper melempar Error beralasan bila gagal, alasannya disimpan di market_list_state. */
async function scrape(market: Market, list: string): Promise<ExploreResult> {
  if (market === "crypto") {
    if (list === "viewed") return scrapeCmcMostViewed();
    throw new Error(`daftar ${list} tidak dikenal`);
  }
  const def = LIST_DEFS[market].find((d) => d.from === list && d.sub);
  if (!def?.sub) throw new Error(`daftar ${list} tidak dikenal`);
  return scrapePluangExplore(market, def.sub);
}

async function writeRows(
  market: Market,
  list: string,
  rows: { symbol: string; name: string; price: number | null; changePct: number | null; extra: Record<string, unknown> }[],
) {
  if (rows.length === 0) return;
  await db()`
    insert into market_lists (market, list_key, rank, symbol, name, price, change_pct, extra, updated_at)
    select ${market}, ${list}, u.rank, u.symbol, u.name, u.price::numeric, u.change::numeric, u.extra::jsonb, now()
    from unnest(
      ${rows.map((_, i) => i + 1)}::int[],
      ${rows.map((r) => r.symbol)}::text[],
      ${rows.map((r) => r.name)}::text[],
      ${rows.map((r) => (r.price === null ? null : String(r.price)))}::text[],
      ${rows.map((r) => (r.changePct === null ? null : String(r.changePct)))}::text[],
      ${rows.map((r) => JSON.stringify(r.extra))}::text[]
    ) as u(rank, symbol, name, price, change, extra)
    on conflict (market, list_key, rank) do update set
      symbol = excluded.symbol, name = excluded.name, price = excluded.price,
      change_pct = excluded.change_pct, extra = excluded.extra, updated_at = excluded.updated_at`;
  await db()`delete from market_lists where market = ${market} and list_key = ${list} and rank > ${rows.length}`;
}

async function markFetched(market: Market, lists: string[], via: string) {
  await db()`
    insert into market_list_state (market, list_key, fetched_at, refreshing_until, last_error, last_via)
    select ${market}, l, now(), null, null, ${via} from unnest(${lists}::text[]) as l
    on conflict (market, list_key) do update set
      fetched_at = now(), refreshing_until = null, last_error = null, last_via = excluded.last_via`;
}

/** Mengambil kunci pembaruan. false bila pembaruan lain sedang berjalan atau baru saja gagal. */
async function acquire(market: Market, list: string): Promise<boolean> {
  const rows = await db()`
    insert into market_list_state (market, list_key, refreshing_until)
    values (${market}, ${list}, now() + make_interval(secs => ${LOCK_SECONDS}))
    on conflict (market, list_key) do update set refreshing_until = excluded.refreshing_until
      where market_list_state.refreshing_until is null or market_list_state.refreshing_until < now()
    returning market`;
  return rows.length > 0;
}

async function backoff(market: Market, list: string, reason: string) {
  await db()`
    update market_list_state
    set refreshing_until = now() + make_interval(secs => ${FAILURE_BACKOFF_SECONDS}), last_error = ${reason.slice(0, 300)}
    where market = ${market} and list_key = ${list}`;
}

export type RefreshOutcome = { ok: boolean; via: string | null; error: string | null };

/** Scrape satu daftar lalu simpan ke database. */
export async function refreshList(market: Market, list: string): Promise<RefreshOutcome> {
  if (!(await acquire(market, list))) {
    return { ok: false, via: null, error: "sedang diperbarui proses lain atau baru saja gagal" };
  }

  try {
    const result = await scrape(market, list);

    await writeRows(
      market,
      list,
      result.items.map((item) => ({
        symbol: item.symbol,
        name: item.name,
        price: item.price,
        changePct: item.changePct,
        extra: { icon: item.icon, capLabel: item.capLabel, change7d: item.change7d },
      })),
    );
    const refreshed = [list];

    if (OVERVIEW_OWNER[market] === list && result.overview.length > 0) {
      await writeRows(
        market,
        "overview",
        result.overview.map((o) => ({
          symbol: o.name,
          name: o.name,
          price: null,
          changePct: o.changePct,
          extra: { value: o.value, group: o.group },
        })),
      );
      refreshed.push("overview");
    }

    await markFetched(market, refreshed, result.via);
    try {
      revalidateTag(MARKET_TAG);
    } catch {
      // Dipanggil saat render halaman: cache menyusul kedaluwarsa sendiri dalam 5 menit.
    }
    return { ok: true, via: result.via, error: null };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "gagal";
    await backoff(market, list, reason).catch(() => undefined);
    return { ok: false, via: null, error: reason };
  }
}

export type RefreshReport = { lists: number; updated: number; details: Record<string, RefreshOutcome> };

/** Memperbarui semua daftar, dipakai cron harian sebagai pemanasan. Rinciannya membantu mencari sebab gagal. */
export async function refreshAllLists(): Promise<RefreshReport> {
  const jobs = MARKETS.flatMap((market) => sourceLists(market).map((list) => ({ market, list })));
  const details: Record<string, RefreshOutcome> = {};
  // Dua sekaligus: bila Puppeteer terpakai, browsernya sendiri sudah diantre satu per satu.
  for (let i = 0; i < jobs.length; i += 2) {
    const batch = jobs.slice(i, i + 2);
    const results = await Promise.all(batch.map((j) => refreshList(j.market, j.list)));
    batch.forEach((j, k) => (details[stateKey(j.market, j.list)] = results[k]));
  }
  return { lists: jobs.length, updated: Object.values(details).filter((d) => d.ok).length, details };
}

/* ============================================================
 * Baca
 * ============================================================ */

export type StoredList = {
  items: MarketItem[];
  overview: OverviewItem[];
  fetchedAt: number | null;
  /** Pembaruan terakhir gagal (sumber tidak terjangkau atau strukturnya berubah). */
  failed: boolean;
};

export type ListRequest = { market: Market; list: string };

const withTimeout = <T,>(job: Promise<T>, ms: number, fallback: T) =>
  Promise.race([job, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

function defer(job: () => Promise<unknown>) {
  const run = () => job().catch(() => undefined);
  try {
    after(run);
  } catch {
    void run();
  }
}

type Row = {
  market: Market;
  list_key: string;
  rank: number;
  symbol: string;
  name: string | null;
  price: string | null;
  change_pct: string | null;
  extra: { icon?: string | null; capLabel?: string | null; change7d?: number | null; value?: string; group?: string | null } | null;
};

type StoredState = { market: Market; list_key: string; fetched: string | null; last_error: string | null };
type StoredPayload = { states: StoredState[]; rows: Row[] };

async function readStored(keys: string[]): Promise<StoredPayload> {
  const [states, rows] = await Promise.all([
    db()`
      select market, list_key, (extract(epoch from fetched_at) * 1000)::bigint::text as fetched, last_error
      from market_list_state
      where (market || ':' || list_key) = any(${keys}::text[])`,
    db()`
      select market, list_key, rank, symbol, name, price::text as price, change_pct::text as change_pct, extra
      from market_lists
      where (market || ':' || list_key) = any(${keys}::text[])
      order by market, list_key, rank`,
  ]);
  return { states: states as StoredState[], rows: rows as Row[] };
}

const readStoredCached = unstable_cache(readStored, ["market-stored-v1"], { revalidate: CACHE_SECONDS, tags: [MARKET_TAG] });

/**
 * Membaca daftar dari database. `overview` boleh diminta lewat list "overview".
 * Daftar yang belum pernah ada ditunggu scrapernya paling lama `waitMs`, yang basi diperbarui di belakang.
 */
export async function loadLists(
  requests: ListRequest[],
  opts: { maxAgeMs?: number; waitMs?: number } = {},
): Promise<Map<string, StoredList>> {
  const maxAge = opts.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const waitMs = opts.waitMs ?? 6000;

  const wanted = [...new Map(requests.map((r) => [stateKey(r.market, r.list), r])).values()];
  const ownerOf = (r: ListRequest): ListRequest => (r.list === "overview" ? { market: r.market, list: OVERVIEW_OWNER[r.market] } : r);
  const keys = [...new Set(wanted.flatMap((r) => [stateKey(r.market, r.list), stateKey(ownerOf(r).market, ownerOf(r).list)]))].sort();

  const fetchedMap = (data: StoredPayload) =>
    new Map<string, number | null>(data.states.map((s) => [stateKey(s.market, s.list_key), s.fetched ? Number(s.fetched) : null]));
  // Ringkasan (overview) ikut waktu pembaruan daftar pemiliknya bila barisnya sendiri belum ada.
  const fetchedOf = (at: Map<string, number | null>, r: ListRequest) =>
    at.get(stateKey(r.market, r.list)) ?? (r.list === "overview" ? (at.get(stateKey(ownerOf(r).market, ownerOf(r).list)) ?? null) : null);

  const classify = (data: StoredPayload) => {
    const at = fetchedMap(data);
    const now = Date.now();
    const missing = new Map<string, ListRequest>();
    const stale = new Map<string, ListRequest>();
    for (const r of wanted) {
      const target = ownerOf(r);
      const fetched = fetchedOf(at, r);
      const id = stateKey(target.market, target.list);
      if (fetched === null) missing.set(id, target);
      else if (now - fetched > maxAge) stale.set(id, target);
    }
    return { missing, stale };
  };

  // Bacaan pertama lewat cache bersama (5 menit). Kalau kelihatan ada yang kosong, pastikan lewat bacaan langsung
  // supaya data yang baru masuk tidak tertahan oleh cache.
  let stored = await readStoredCached(keys);
  let { missing, stale } = classify(stored);
  if (missing.size > 0) {
    stored = await readStored(keys);
    ({ missing, stale } = classify(stored));
  }

  if (missing.size > 0) {
    const jobs = Promise.all([...missing.values()].map((t) => refreshList(t.market, t.list)));
    const finished = await withTimeout(jobs.then(() => true), waitMs, false);
    // Di Vercel proses berhenti saat respons terkirim, jadi scrape yang belum selesai dilanjutkan lewat after().
    if (!finished) defer(() => jobs);
    stored = await readStored(keys);
  }
  for (const [id, target] of stale) {
    if (!missing.has(id)) defer(() => refreshList(target.market, target.list));
  }

  const freshAt = fetchedMap(stored);
  const failedAt = new Set(stored.states.filter((s) => s.last_error).map((s) => stateKey(s.market, s.list_key)));
  const rows = stored.rows;

  const result = new Map<string, StoredList>();
  for (const r of wanted) {
    result.set(stateKey(r.market, r.list), {
      items: [],
      overview: [],
      fetchedAt: fetchedOf(freshAt, r),
      failed: failedAt.has(stateKey(r.market, r.list)),
    });
  }

  for (const row of rows) {
    const stored = result.get(stateKey(row.market, row.list_key));
    if (!stored) continue;
    const extra = row.extra ?? {};

    if (row.list_key === "overview") {
      stored.overview.push({
        name: row.name ?? row.symbol,
        value: extra.value ?? "",
        changePct: row.change_pct === null ? null : Number(row.change_pct),
        group: extra.group ?? null,
      });
      continue;
    }

    stored.items.push({
      rank: row.rank,
      symbol: row.symbol,
      name: row.name ?? row.symbol,
      price: Number(row.price),
      changePct: row.change_pct === null ? null : Number(row.change_pct),
      ccy: MARKET_CCY[row.market],
      icon: safeIconUrl(extra.icon),
      capLabel: extra.capLabel ?? null,
      change7d: typeof extra.change7d === "number" ? extra.change7d : null,
    });
  }
  return result;
}

/** Menerapkan definisi daftar (termasuk turunan Naik dan Turun) pada baris sumber. */
export function applyListDef(def: ListDef, source: MarketItem[]): MarketItem[] {
  if (def.derive === "gainers") {
    return source.filter((i) => (i.changePct ?? 0) > 0).sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
  }
  if (def.derive === "losers") {
    return source.filter((i) => (i.changePct ?? 0) < 0).sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0));
  }
  return source;
}

/* ============================================================
 * Bentuk data untuk layar
 * ============================================================ */

const toWatchItem = (market: Market, item: MarketItem): WatchItem => ({
  symbol: item.symbol,
  name: item.name,
  market,
  ccy: item.ccy,
  price: item.price,
  change: item.changePct ?? 0,
  icon: item.icon,
  capLabel: item.capLabel,
});

/**
 * Watchlist dashboard untuk ketiga pasar. Tiap daftar dibatasi `limit` (sesuai paket),
 * `locked` hanya jumlah aset yang tersembunyi untuk ajakan upgrade, datanya tidak dikirim.
 */
export async function getWatchlistData(limit: number, maxAgeMs: number = DEFAULT_MAX_AGE_MS): Promise<WatchMarket[]> {
  const requests = MARKETS.flatMap((market) => sourceLists(market).map((list) => ({ market, list })));
  const loaded = await loadLists(requests, { waitMs: 4500, maxAgeMs });
  const cap = TIER_LIMITS.premium.watchlistItems;

  return MARKETS.map((market) => {
    const lists = LIST_DEFS[market].map((def) => {
      const pool = applyListDef(def, loaded.get(stateKey(market, def.from))?.items ?? []).slice(0, cap);
      const items = pool.slice(0, limit).map((item) => toWatchItem(market, item));
      return { key: def.key, label: def.label, items, locked: pool.length - items.length };
    });
    const sources = sourceLists(market).map((list) => loaded.get(stateKey(market, list)));
    const times = sources.map((l) => l?.fetchedAt ?? 0);
    const hasItems = sources.some((l) => (l?.items.length ?? 0) > 0);
    return { market, lists, updatedAt: Math.max(...times) || null, failed: !hasItems && sources.some((l) => l?.failed) };
  });
}

export type MarketPage = { items: MarketItem[]; overview: OverviewItem[]; updatedAt: number | null; failed: boolean };

/** Satu daftar lengkap beserta ringkasan pasar, untuk tab Pasar. */
export async function getMarketPage(market: Market, def: ListDef, maxAgeMs: number = DEFAULT_MAX_AGE_MS): Promise<MarketPage> {
  const loaded = await loadLists(
    [
      { market, list: def.from },
      { market, list: "overview" },
    ],
    { waitMs: 6000, maxAgeMs },
  );
  const source = loaded.get(stateKey(market, def.from));
  return {
    items: applyListDef(def, source?.items ?? []),
    overview: loaded.get(stateKey(market, "overview"))?.overview ?? [],
    updatedAt: source?.fetchedAt ?? null,
    failed: Boolean(source?.failed) && (source?.items.length ?? 0) === 0,
  };
}
