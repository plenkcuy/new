import "server-only";
import { db } from "./db";
import { DAY_MS } from "./journal-calc";
import { safeIconUrl } from "./shared";

/**
 * Sumber data harga:
 *   saham IDX, saham US, crypto besar : Yahoo Finance (data harian, tertunda)
 *   meme coin                         : DexScreener (harga terkini berdasarkan alamat kontrak)
 *   kurs USD ke IDR                   : Yahoo Finance, cadangan open.er-api.com
 * Semua pemanggil menelan kegagalan: jurnal tetap jalan memakai harga dari transaksi terakhir.
 */

const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; LumenJournal/1.0)", Accept: "application/json" };

export async function getJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000), cache: "no-store" });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

type DailyClose = { day: string; close: number };

type YahooChart = {
  chart?: { result?: { timestamp?: number[]; indicators?: { quote?: { close?: (number | null)[] }[] } }[] };
};

async function yahooDaily(ref: string, fromMs: number): Promise<DailyClose[]> {
  const from = Math.floor((fromMs - 3 * DAY_MS) / 1000);
  const to = Math.floor((Date.now() + DAY_MS) / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ref)}?period1=${from}&period2=${to}&interval=1d`;
  const result = ((await getJson(url)) as YahooChart | null)?.chart?.result?.[0];
  const stamps = result?.timestamp;
  const closes = result?.indicators?.quote?.[0]?.close;
  if (!stamps || !closes) return [];

  const rows: DailyClose[] = [];
  stamps.forEach((stamp, i) => {
    const close = closes[i];
    if (typeof close === "number" && Number.isFinite(close) && close > 0) {
      rows.push({ day: new Date(stamp * 1000).toISOString().slice(0, 10), close });
    }
  });
  return rows;
}

type DexResponse = {
  pairs?:
    | {
        chainId?: string;
        priceUsd?: string;
        liquidity?: { usd?: number };
        priceChange?: { h24?: number };
        info?: { imageUrl?: string };
      }[]
    | null;
};

/** Harga terkini token dari pair dengan likuiditas terbesar di chain yang dipilih. */
export async function dexScreenerQuote(
  chain: string,
  address: string,
): Promise<{ price: number; changePct: number | null; icon: string | null } | null> {
  const data = (await getJson(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`)) as DexResponse | null;
  const pairs = (data?.pairs ?? []).filter((p) => p.chainId === chain && Number(p.priceUsd) > 0);
  if (pairs.length === 0) return null;
  pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
  const best = pairs[0];
  const change = best.priceChange?.h24;
  return {
    price: Number(best.priceUsd),
    changePct: typeof change === "number" ? change : null,
    icon: safeIconUrl(best.info?.imageUrl),
  };
}

async function dexScreenerPrice(chain: string, address: string): Promise<number | null> {
  return (await dexScreenerQuote(chain, address))?.price ?? null;
}

export async function latestUsdIdrFallback(): Promise<number | null> {
  const data = (await getJson("https://open.er-api.com/v6/latest/USD")) as { rates?: { IDR?: number } } | null;
  const rate = data?.rates?.IDR;
  return typeof rate === "number" && rate > 1000 ? rate : null;
}

const today = () => new Date().toISOString().slice(0, 10);

async function savePrices(assetId: number, rows: DailyClose[]) {
  if (rows.length === 0) return;
  await db()`
    insert into journal_prices (asset_id, day, close)
    select ${assetId}::bigint, u.d, u.c
    from unnest(${rows.map((r) => r.day)}::date[], ${rows.map((r) => String(r.close))}::numeric[]) as u(d, c)
    on conflict (asset_id, day) do update set close = excluded.close`;
}

async function saveFx(rows: DailyClose[]) {
  if (rows.length === 0) return;
  await db()`
    insert into journal_fx (day, usd_idr)
    select u.d, u.c
    from unnest(${rows.map((r) => r.day)}::date[], ${rows.map((r) => String(r.close))}::numeric[]) as u(d, c)
    on conflict (day) do update set usd_idr = excluded.usd_idr`;
}

/** Menyimpan URL ikon aset bila berubah. */
export async function saveAssetIcons(entries: { assetId: number; icon: string }[]) {
  if (entries.length === 0) return;
  await db()`
    update journal_assets a set icon_url = u.icon
    from unnest(${entries.map((e) => e.assetId)}::bigint[], ${entries.map((e) => e.icon)}::text[]) as u(id, icon)
    where a.id = u.id and a.icon_url is distinct from u.icon`;
}

export type FeedAsset = {
  id: number;
  priceSource: string;
  priceRef: string;
  chain: string | null;
};

/** Mengisi harga penutupan sejak `fromMs`. Mengembalikan true bila ada data yang tersimpan. */
export async function refreshAssetPrices(asset: FeedAsset, fromMs: number): Promise<boolean> {
  if (asset.priceSource === "yahoo") {
    const rows = await yahooDaily(asset.priceRef, fromMs);
    await savePrices(asset.id, rows);
    return rows.length > 0;
  }
  if (asset.priceSource === "dexscreener" && asset.chain) {
    const price = await dexScreenerPrice(asset.chain, asset.priceRef);
    if (price === null) return false;
    await savePrices(asset.id, [{ day: today(), close: price }]);
    return true;
  }
  return false;
}

export async function refreshFx(fromMs: number): Promise<boolean> {
  const rows = await yahooDaily("USDIDR=X", fromMs);
  if (rows.length > 0) {
    await saveFx(rows);
    return true;
  }
  const latest = await latestUsdIdrFallback();
  if (latest === null) return false;
  await saveFx([{ day: today(), close: latest }]);
  return true;
}

/** Kurs USD ke IDR pada tanggal tertentu: dari tabel, lalu dari sumber luar. null bila tidak ada. */
export async function getUsdIdrAt(ms: number): Promise<number | null> {
  const day = new Date(ms).toISOString().slice(0, 10);
  const read = async () => {
    const rows = await db()`
      select usd_idr::text as v from journal_fx
      where day <= ${day}::date and day >= ${day}::date - 7
      order by day desc limit 1`;
    return rows[0]?.v ? Number(rows[0].v) : null;
  };

  const cached = await read();
  if (cached) return cached;

  await refreshFx(ms - 10 * DAY_MS);
  return read();
}

export type RefreshReport = { assets: number; updated: number; failed: number; fx: boolean };

/** Dipanggil cron harian: perbarui harga semua aset yang pernah ditransaksikan, lalu kurs. */
export async function refreshEverything(): Promise<RefreshReport> {
  const rows = await db()`
    select a.id::text as id, a.price_source, a.price_ref, a.chain,
           (extract(epoch from min(t.traded_at)) * 1000)::bigint::text as first_t,
           (select max(p.day)::text from journal_prices p where p.asset_id = a.id) as last_day
    from journal_assets a
    join journal_trades t on t.asset_id = a.id
    group by a.id`;

  let updated = 0;
  let failed = 0;
  let earliest = Date.now();

  for (let i = 0; i < rows.length; i += 4) {
    const batch = rows.slice(i, i + 4);
    const results = await Promise.allSettled(
      batch.map((row) => {
        const firstTrade = Number(row.first_t);
        earliest = Math.min(earliest, firstTrade);
        const from = row.last_day ? Date.parse(row.last_day) - 5 * DAY_MS : firstTrade;
        return refreshAssetPrices(
          { id: Number(row.id), priceSource: row.price_source, priceRef: row.price_ref, chain: row.chain },
          from,
        );
      }),
    );
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) updated += 1;
      else failed += 1;
    }
  }

  const lastFx = await db()`select max(day)::text as d from journal_fx`;
  const fxFrom = lastFx[0]?.d ? Date.parse(lastFx[0].d) - 5 * DAY_MS : earliest;
  const fx = rows.length > 0 ? await refreshFx(fxFrom) : false;

  return { assets: rows.length, updated, failed, fx };
}
