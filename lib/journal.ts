import "server-only";
import { db } from "./db";
import {
  buildEquity,
  buildMarket,
  dayFloor,
  findOversell,
  sliceEquity,
  summarize,
  withLive,
  tradeStats,
  type AssetMeta,
  type EquitySlice,
  type Mark,
  type Summary,
  type TradeInput,
  type TradeStats,
} from "./journal-calc";
import type { TradeFormValue } from "./journal-input";
import { getUsdIdrAt, saveAssetIcons, type FeedAsset } from "./market-feed";
import { fetchQuotes, fetchUsdIdrLive, type QuoteTarget } from "./quotes";
import { assetIconUrl, type AssetClass, type Ccy, type LivePosition } from "./shared";

/* ============================================================
 * Membaca data
 * ============================================================ */

export type TradeRow = TradeInput &
  AssetMeta & {
    chain: string | null;
    priceRef: string;
    /** Ikon yang tersimpan di database (tanpa tebakan). */
    iconStored: string | null;
    takeProfit: number | null;
    setup: string | null;
    emotion: string | null;
    notes: string | null;
    tags: string[];
  };

const optNum = (value: string | null | undefined) => (value === null || value === undefined ? null : Number(value));

/** Seluruh transaksi milik satu pengguna, urut dari yang terlama. */
export async function loadTradeRows(userId: string): Promise<TradeRow[]> {
  const rows = await db()`
    select t.id::text as id, t.asset_id::text as asset_id, a.symbol, a.name, a.asset_class, a.ccy, a.chain, a.price_ref, a.icon_url,
           t.side, t.qty::text as qty, t.price::text as price, t.fee::text as fee, t.usd_idr::text as usd_idr,
           (extract(epoch from t.traded_at) * 1000)::bigint::text as t,
           t.stop_loss::text as stop_loss, t.take_profit::text as take_profit,
           t.setup, t.emotion, t.notes, t.tags
    from journal_trades t
    join journal_assets a on a.id = t.asset_id
    where t.user_id = ${userId}
    order by t.traded_at asc, t.id asc`;

  return rows.map((r) => ({
    id: Number(r.id),
    assetId: Number(r.asset_id),
    symbol: r.symbol,
    name: r.name,
    assetClass: r.asset_class as AssetClass,
    ccy: r.ccy as Ccy,
    chain: r.chain,
    priceRef: r.price_ref,
    iconStored: r.icon_url,
    icon: assetIconUrl(r.asset_class as AssetClass, r.symbol, r.icon_url),
    side: r.side as "buy" | "sell",
    qty: Number(r.qty),
    price: Number(r.price),
    fee: Number(r.fee),
    usdIdr: Number(r.usd_idr),
    t: Number(r.t),
    stopLoss: optNum(r.stop_loss),
    takeProfit: optNum(r.take_profit),
    setup: r.setup,
    emotion: r.emotion,
    notes: r.notes,
    tags: r.tags ?? [],
  }));
}

async function loadPriceRows(assetIds: number[]): Promise<Map<number, Mark[]>> {
  const map = new Map<number, Mark[]>();
  if (assetIds.length === 0) return map;
  const rows = await db()`
    select asset_id::text as asset_id,
           (extract(epoch from day::timestamp) * 1000)::bigint::text as t,
           close::text as v
    from journal_prices
    where asset_id = any(${assetIds}::bigint[])
    order by asset_id, day`;
  for (const r of rows) {
    const id = Number(r.asset_id);
    const list = map.get(id) ?? [];
    list.push({ t: Number(r.t), v: Number(r.v) });
    map.set(id, list);
  }
  return map;
}

async function loadFxRows(): Promise<Mark[]> {
  const rows = await db()`
    select (extract(epoch from day::timestamp) * 1000)::bigint::text as t, usd_idr::text as v
    from journal_fx order by day`;
  return rows.map((r) => ({ t: Number(r.t), v: Number(r.v) }));
}

export async function countTrades(userId: string): Promise<number> {
  const rows = await db()`select count(*)::int as n from journal_trades where user_id = ${userId}`;
  return Number(rows[0]?.n ?? 0);
}

/* ============================================================
 * Data untuk halaman jurnal
 * ============================================================ */

export type HistoryRow = {
  id: number;
  t: number;
  symbol: string;
  assetClass: AssetClass;
  ccy: Ccy;
  icon: string | null;
  side: "buy" | "sell";
  qty: number;
  price: number;
  fee: number;
  stopLoss: number | null;
  takeProfit: number | null;
  setup: string | null;
  emotion: string | null;
  notes: string | null;
  tags: string[];
  result: { pnl: number; pnlPct: number; r: number | null } | null;
};

export type JournalData = {
  /** Jumlah seluruh transaksi pengguna (tanpa filter), untuk batas paket. */
  totalTrades: number;
  summary: Summary;
  equity: EquitySlice;
  /** Hanya terisi untuk paket dengan fitur journal-analytics. */
  analytics: { stats: TradeStats; pnlByAsset: Summary["pnlByAsset"] } | null;
  history: { rows: HistoryRow[]; page: number; pages: number; total: number };
};

export const HISTORY_PAGE_SIZE = 15;

export async function getJournal(opts: {
  userId: string;
  report: Ccy;
  cls: AssetClass | null;
  rangeDays: number;
  premium: boolean;
  page: number;
}): Promise<JournalData> {
  const all = await loadTradeRows(opts.userId);
  const rows = opts.cls ? all.filter((r) => r.assetClass === opts.cls) : all;

  const assets = new Map<number, AssetMeta>();
  for (const r of rows) {
    assets.set(r.assetId, { id: r.assetId, symbol: r.symbol, name: r.name, assetClass: r.assetClass, ccy: r.ccy, icon: r.icon });
  }

  const [priceRows, fxRows] = await Promise.all([loadPriceRows([...assets.keys()]), loadFxRows()]);
  const market = buildMarket(rows, priceRows, fxRows);

  const now = Date.now();
  const endDay = dayFloor(now);
  const summary = summarize(rows, assets, market, opts.report, now);
  const equity = sliceEquity(buildEquity(rows, assets, market, opts.report, endDay), opts.rangeDays, endDay, opts.premium);

  const resultByTrade = new Map(summary.closed.map((c) => [c.tradeId, c]));
  const newestFirst = [...rows].reverse();
  const pages = Math.max(1, Math.ceil(newestFirst.length / HISTORY_PAGE_SIZE));
  const page = Math.min(Math.max(1, opts.page), pages);
  const history: HistoryRow[] = newestFirst.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE).map((r) => {
    const closed = resultByTrade.get(r.id);
    return {
      id: r.id,
      t: r.t,
      symbol: r.symbol,
      assetClass: r.assetClass,
      ccy: r.ccy,
      icon: r.icon ?? null,
      side: r.side,
      qty: r.qty,
      price: r.price,
      fee: r.fee,
      stopLoss: r.stopLoss,
      takeProfit: r.takeProfit,
      setup: r.setup,
      emotion: r.emotion,
      notes: r.notes,
      tags: r.tags,
      result: closed ? { pnl: closed.pnl, pnlPct: closed.pnlPct, r: closed.r } : null,
    };
  });

  return {
    totalTrades: all.length,
    summary,
    equity,
    analytics: opts.premium ? { stats: tradeStats(summary.closed), pnlByAsset: summary.pnlByAsset } : null,
    history: { rows: history, page, pages, total: rows.length },
  };
}

/* ============================================================
 * Menulis data
 * ============================================================ */

type AssetRecord = FeedAsset & { symbol: string };

function assetDefinition(v: TradeFormValue) {
  const ccy: Ccy = v.assetClass === "idx" ? "IDR" : "USD";
  if (v.assetClass === "meme") return { ccy, source: "dexscreener", ref: v.contract as string };
  if (v.assetClass === "idx") return { ccy, source: "yahoo", ref: `${v.symbol}.JK` };
  if (v.assetClass === "us_stock") return { ccy, source: "yahoo", ref: v.symbol.replace(".", "-") };
  return { ccy, source: "yahoo", ref: `${v.symbol}-USD` };
}

async function findOrCreateAsset(v: TradeFormValue): Promise<AssetRecord> {
  const def = assetDefinition(v);

  if (v.assetClass === "meme") {
    const existing = await db()`
      select id::text as id, symbol, price_source, price_ref, chain from journal_assets
      where asset_class = 'meme' and chain = ${v.chain}::text and contract_addr = ${v.contract}::text`;
    if (existing[0]) {
      const r = existing[0];
      return { id: Number(r.id), symbol: r.symbol, priceSource: r.price_source, priceRef: r.price_ref, chain: r.chain };
    }
  }

  const rows = await db()`
    insert into journal_assets (asset_class, symbol, name, ccy, chain, contract_addr, price_source, price_ref)
    values (${v.assetClass}, ${v.symbol}, ${v.symbol}, ${def.ccy}, ${v.chain}::text, ${v.contract}::text, ${def.source}, ${def.ref})
    on conflict (asset_class, symbol, coalesce(chain, ''), coalesce(contract_addr, ''))
    do update set symbol = excluded.symbol
    returning id::text as id, symbol, price_source, price_ref, chain`;
  const r = rows[0];
  return { id: Number(r.id), symbol: r.symbol, priceSource: r.price_source, priceRef: r.price_ref, chain: r.chain };
}

export type InsertResult = { ok: true; asset: FeedAsset } | { ok: false; message: string };

export async function insertTrade(userId: string, limit: number | null, v: TradeFormValue): Promise<InsertResult> {
  if (limit !== null && (await countTrades(userId)) >= limit) {
    return { ok: false, message: `Paket Free dibatasi ${limit} transaksi. Upgrade ke Premium untuk jurnal tanpa batas.` };
  }

  const asset = await findOrCreateAsset(v);

  let usdIdr = v.usdIdr ? Number(v.usdIdr) : null;
  if (usdIdr === null) usdIdr = await getUsdIdrAt(v.tradedAt);
  if (usdIdr === null) {
    return { ok: false, message: "Kurs USD ke IDR belum tersedia saat ini. Isi kolom kurs secara manual." };
  }

  const existing = (await loadTradeRows(userId)).filter((r) => r.assetId === asset.id);
  const draft: TradeInput = {
    id: Number.MAX_SAFE_INTEGER,
    assetId: asset.id,
    symbol: v.symbol,
    side: v.side,
    qty: Number(v.qty),
    price: Number(v.price),
    fee: Number(v.fee),
    usdIdr,
    t: v.tradedAt,
    stopLoss: null,
  };
  if (findOversell([...existing, draft])) {
    return { ok: false, message: "Jumlah jual melebihi posisi yang kamu pegang pada waktu itu." };
  }

  await db()`
    insert into journal_trades
      (user_id, asset_id, side, qty, price, fee, usd_idr, traded_at, stop_loss, take_profit, setup, emotion, notes, tags)
    values
      (${userId}, ${asset.id}::bigint, ${v.side}, ${v.qty}::numeric, ${v.price}::numeric, ${v.fee}::numeric,
       ${usdIdr}::numeric, to_timestamp(${v.tradedAt}::double precision / 1000),
       ${v.stopLoss}::numeric, ${v.takeProfit}::numeric, ${v.setup}::text, ${v.emotion}::text, ${v.notes}::text,
       ${v.tags}::text[])`;

  return { ok: true, asset };
}

export type RemoveResult = { ok: true } | { ok: false; code: "missing" | "oversell" };

export async function removeTrade(userId: string, tradeId: number): Promise<RemoveResult> {
  const owned = await db()`
    select asset_id::text as asset_id from journal_trades where id = ${tradeId}::bigint and user_id = ${userId}`;
  if (!owned[0]) return { ok: false, code: "missing" };

  const assetId = Number(owned[0].asset_id);
  const remaining = (await loadTradeRows(userId)).filter((r) => r.assetId === assetId && r.id !== tradeId);
  if (findOversell(remaining)) {
    return { ok: false, code: "oversell" };
  }

  await db()`delete from journal_trades where id = ${tradeId}::bigint and user_id = ${userId}`;
  return { ok: true };
}

/* ============================================================
 * Portofolio live
 * ============================================================ */

/** Aset yang masih punya sisa posisi, sebagai target pengambilan harga. */
export function openTargets(rows: TradeRow[]): QuoteTarget[] {
  const held = new Map<number, number>();
  const meta = new Map<number, TradeRow>();
  for (const r of [...rows].sort((a, b) => a.t - b.t || a.id - b.id)) {
    held.set(r.assetId, (held.get(r.assetId) ?? 0) + (r.side === "buy" ? r.qty : -r.qty));
    meta.set(r.assetId, r);
  }
  const targets: QuoteTarget[] = [];
  for (const [assetId, qty] of held) {
    const r = meta.get(assetId);
    if (!r || qty <= 1e-9 * Math.max(1, r.qty)) continue;
    targets.push({ assetId, assetClass: r.assetClass, symbol: r.symbol, chain: r.chain, priceRef: r.priceRef });
  }
  return targets;
}

const withTimeout = <T,>(job: Promise<T>, ms: number, fallback: T) =>
  Promise.race([job, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

export type PortfolioData = {
  totalTrades: number;
  positions: LivePosition[];
  realized: number;
  usdIdr: number;
  equity: EquitySlice;
  liveLoaded: boolean;
};

/** Portofolio dari data jurnal, dinilai dengan harga terkini (batas tunggu 3,5 detik). */
export async function getPortfolio(opts: {
  userId: string;
  report: Ccy;
  rangeDays: number;
  premium: boolean;
  maxAgeMs: number;
}): Promise<PortfolioData> {
  const rows = await loadTradeRows(opts.userId);

  const assets = new Map<number, AssetMeta>();
  for (const r of rows) {
    assets.set(r.assetId, { id: r.assetId, symbol: r.symbol, name: r.name, assetClass: r.assetClass, ccy: r.ccy, icon: r.icon });
  }

  const [priceRows, fxRows] = await Promise.all([loadPriceRows([...assets.keys()]), loadFxRows()]);
  const base = buildMarket(rows, priceRows, fxRows);

  const targets = openTargets(rows);
  const [quotes, usdIdrLive] = await Promise.all([
    withTimeout(fetchQuotes(targets, opts.maxAgeMs), 3500, new Map()),
    withTimeout(fetchUsdIdrLive(opts.maxAgeMs), 3500, null),
  ]);

  const now = Date.now();
  const market = withLive(base, new Map([...quotes].map(([id, q]) => [id, q.price])), usdIdrLive, now);
  const summary = summarize(rows, assets, market, opts.report, now);
  const endDay = dayFloor(now);
  const equity = sliceEquity(buildEquity(rows, assets, market, opts.report, endDay), opts.rangeDays, endDay, opts.premium);

  const meta = new Map(rows.map((r) => [r.assetId, r]));
  const positions: LivePosition[] = summary.positions.map((p) => {
    const quote = quotes.get(p.assetId);
    const symbol = meta.get(p.assetId)?.symbol ?? p.symbol;
    return {
      assetId: p.assetId,
      symbol: p.symbol,
      name: p.name,
      assetClass: p.assetClass,
      ccy: p.ccy,
      qty: p.qty,
      avgPrice: p.avgPrice,
      costReport: p.cost,
      price: p.price,
      changePct: quote?.changePct ?? null,
      priceFromTrade: p.priceFromTrade,
      source: quote?.source ?? null,
      stream: p.assetClass === "crypto" && /^[A-Z0-9]{2,12}$/.test(symbol) ? `${symbol.toLowerCase()}usdt` : null,
      icon: assetIconUrl(p.assetClass, p.symbol, quote?.icon ?? meta.get(p.assetId)?.iconStored),
    };
  });

  // Ikon dari sumber disimpan sekali supaya halaman lain ikut menampilkannya.
  const fresh = [...quotes]
    .filter(([id, q]) => q.icon && q.icon !== meta.get(id)?.iconStored)
    .map(([assetId, q]) => ({ assetId, icon: q.icon as string }));
  try {
    await saveAssetIcons(fresh);
  } catch {
    // Gagal menyimpan ikon tidak boleh menggagalkan halaman.
  }

  const fxMarks = market.fx;
  return {
    totalTrades: rows.length,
    positions,
    realized: summary.totals.realized,
    usdIdr: fxMarks.length ? fxMarks[fxMarks.length - 1].v : 1,
    equity,
    liveLoaded: quotes.size > 0,
  };
}
