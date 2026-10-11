import "server-only";
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

async function scrape(market: Market, list: string): Promise<ExploreResult | null> {
  if (market === "crypto") return list === "viewed" ? scrapeCmcMostViewed() : null;
  const def = LIST_DEFS[market].find((d) => d.from === list && d.sub);
  return def?.sub ? scrapePluangExplore(market, def.sub) : null;
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

async function markFetched(market: Market, lists: string[]) {
  await db()`
    insert into market_list_state (market, list_key, fetched_at, refreshing_until)
    select ${market}, l, now(), null from unnest(${lists}::text[]) as l
    on conflict (market, list_key) do update set fetched_at = now(), refreshing_until = null`;
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

async function backoff(market: Market, list: string) {
  await db()`
    update market_list_state set refreshing_until = now() + make_interval(secs => ${FAILURE_BACKOFF_SECONDS})
    where market = ${market} and list_key = ${list}`;
}

/** Scrape satu daftar lalu simpan ke database. true bila ada data baru yang tersimpan. */
export async function refreshList(market: Market, list: string): Promise<boolean> {
  if (!(await acquire(market, list))) return false;

  try {
    const result = await scrape(market, list);
    if (!result) {
      await backoff(market, list);
      return false;
    }

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

    await markFetched(market, refreshed);
    return true;
  } catch {
    await backoff(market, list).catch(() => undefined);
    return false;
  }
}

/** Memperbarui semua daftar, dipakai cron harian sebagai pemanasan. */
export async function refreshAllLists(): Promise<{ lists: number; updated: number }> {
  const jobs = MARKETS.flatMap((market) => sourceLists(market).map((list) => ({ market, list })));
  let updated = 0;
  for (let i = 0; i < jobs.length; i += 4) {
    const results = await Promise.all(jobs.slice(i, i + 4).map((j) => refreshList(j.market, j.list)));
    updated += results.filter(Boolean).length;
  }
  return { lists: jobs.length, updated };
}

/* ============================================================
 * Baca
 * ============================================================ */

export type StoredList = { items: MarketItem[]; overview: OverviewItem[]; fetchedAt: number | null };

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
  const keys = wanted.map((r) => stateKey(r.market, r.list));

  const states = await db()`
    select market, list_key, (extract(epoch from fetched_at) * 1000)::bigint::text as fetched
    from market_list_state
    where (market || ':' || list_key) = any(${keys}::text[])`;
  const fetchedAt = new Map<string, number | null>(
    states.map((s) => [stateKey(s.market, s.list_key), s.fetched ? Number(s.fetched) : null]),
  );

  const now = Date.now();
  const missing = new Map<string, ListRequest>();
  const stale = new Map<string, ListRequest>();
  for (const r of wanted) {
    const target = r.list === "overview" ? { market: r.market, list: OVERVIEW_OWNER[r.market] } : r;
    const at = fetchedAt.get(stateKey(r.market, r.list)) ?? null;
    const id = stateKey(target.market, target.list);
    if (at === null) missing.set(id, target);
    else if (now - at > maxAge) stale.set(id, target);
  }

  if (missing.size > 0) {
    await withTimeout(Promise.all([...missing.values()].map((t) => refreshList(t.market, t.list))), waitMs, []);
  }
  for (const [id, target] of stale) {
    if (!missing.has(id)) defer(() => refreshList(target.market, target.list));
  }

  const rows = (await db()`
    select market, list_key, rank, symbol, name, price::text as price, change_pct::text as change_pct, extra
    from market_lists
    where (market || ':' || list_key) = any(${keys}::text[])
    order by market, list_key, rank`) as Row[];

  const latest = await db()`
    select market, list_key, (extract(epoch from fetched_at) * 1000)::bigint::text as fetched
    from market_list_state
    where (market || ':' || list_key) = any(${keys}::text[])`;
  const freshAt = new Map<string, number | null>(
    latest.map((s) => [stateKey(s.market, s.list_key), s.fetched ? Number(s.fetched) : null]),
  );

  const result = new Map<string, StoredList>();
  for (const r of wanted) {
    result.set(stateKey(r.market, r.list), {
      items: [],
      overview: [],
      fetchedAt: freshAt.get(stateKey(r.market, r.list)) ?? null,
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
    const times = sourceLists(market).map((list) => loaded.get(stateKey(market, list))?.fetchedAt ?? 0);
    return { market, lists, updatedAt: Math.max(...times) || null };
  });
}

export type MarketPage = { items: MarketItem[]; overview: OverviewItem[]; updatedAt: number | null };

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
  };
}
