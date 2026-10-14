import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import {
  buildEquity,
  buildMarket,
  dayFloor,
  findOversell,
  isOpening,
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
import { CLASS_LABEL, assetIconUrl, type AssetClass, type CalendarDay, type Ccy, type Direction, type LivePosition } from "./shared";

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
    direction: Direction;
    /** Penanda pasangan beli dan jual dari satu input "tandai close". */
    linkId: string | null;
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
           t.pnl_manual::text as pnl_manual, t.link_id, t.direction,
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
    pnlManual: optNum(r.pnl_manual),
    linkId: r.link_id ?? null,
    direction: (r.direction === "short" ? "short" : "long") as Direction,
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
  linkId: string | null;
  direction: Direction;
  result: { pnl: number; pnlPct: number; r: number | null; manual: boolean } | null;
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
      linkId: r.linkId,
      direction: r.direction,
      result: closed ? { pnl: closed.pnl, pnlPct: closed.pnlPct, r: closed.r, manual: closed.manual } : null,
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

/**
 * Menyimpan transaksi. Dengan "tandai close" dibuat dua baris sekaligus (beli lalu jual) yang saling
 * tertaut lewat link_id, dalam satu perintah INSERT sehingga tidak pernah tersimpan setengah.
 */
export async function insertTrade(userId: string, limit: number | null, v: TradeFormValue): Promise<InsertResult> {
  const opening = isOpening(v.direction, v.side);
  const closeSide = v.side === "buy" ? "sell" : "buy";

  // Menutup posisi tidak pernah diblokir batas paket. Yang dihitung hanya entry baru.
  if (opening && limit !== null) {
    const slots = v.closed ? 2 : 1;
    const used = await countTrades(userId);
    if (used + slots > limit) {
      const message = v.closed
        ? `Tandai close memakai 2 transaksi (buka dan tutup). Sisa jatah Free: ${Math.max(0, limit - used)} dari ${limit}. Upgrade ke Premium untuk jurnal tanpa batas.`
        : `Paket Free dibatasi ${limit} transaksi. Upgrade ke Premium untuk jurnal tanpa batas.`;
      return { ok: false, message };
    }
  }

  const asset = await findOrCreateAsset(v);

  const rateAt = async (ms: number) => (v.usdIdr ? Number(v.usdIdr) : await getUsdIdrAt(ms));
  const entryRate = await rateAt(v.tradedAt);
  const closeRate = v.closed && v.closeAt !== null ? await rateAt(v.closeAt) : null;
  if (entryRate === null || (v.closed && closeRate === null)) {
    return { ok: false, message: "Kurs USD ke IDR belum tersedia saat ini. Isi kolom kurs secara manual." };
  }

  const draft = (id: number, side: "buy" | "sell", qty: string, price: string, fee: string, t: number, usdIdr: number): TradeInput => ({
    id,
    assetId: asset.id,
    symbol: v.symbol,
    side,
    direction: v.direction,
    qty: Number(qty),
    price: Number(price),
    fee: Number(fee),
    usdIdr,
    t,
    stopLoss: null,
  });
  const drafts: TradeInput[] = [draft(Number.MAX_SAFE_INTEGER - 1, v.side, v.qty, v.price, v.fee, v.tradedAt, entryRate)];
  if (v.closed && v.closePrice !== null && v.closeAt !== null && v.feeClose !== null && closeRate !== null) {
    drafts.push(draft(Number.MAX_SAFE_INTEGER, closeSide, v.qty, v.closePrice, v.feeClose, v.closeAt, closeRate));
  }

  const existing = (await loadTradeRows(userId)).filter((r) => r.assetId === asset.id);
  if (findOversell([...existing, ...drafts])) {
    return {
      ok: false,
      message: v.direction === "short" ? "Jumlah cover melebihi posisi short yang kamu pegang pada waktu itu." : "Jumlah jual melebihi posisi yang kamu pegang pada waktu itu.",
    };
  }

  if (!v.closed) {
    // Pada transaksi pembuka, stop adalah stop loss. Pada transaksi penutup, stop adalah stop awal untuk R.
    const stop = opening ? v.stopLoss : v.riskStop;
    await db()`
      insert into journal_trades
        (user_id, asset_id, side, direction, qty, price, fee, usd_idr, traded_at, stop_loss, take_profit, pnl_manual, setup, emotion, notes, tags)
      values
        (${userId}, ${asset.id}::bigint, ${v.side}, ${v.direction}, ${v.qty}::numeric, ${v.price}::numeric, ${v.fee}::numeric,
         ${entryRate}::numeric, to_timestamp(${v.tradedAt}::double precision / 1000),
         ${stop}::numeric, ${v.takeProfit}::numeric, ${v.pnlManual}::numeric,
         ${v.setup}::text, ${v.emotion}::text, ${v.notes}::text, ${v.tags}::text[])`;
    return { ok: true, asset };
  }

  // Satu perintah INSERT untuk dua baris, supaya tidak pernah tersimpan setengah.
  // Catatan jurnal (setup, emosi, tag, catatan) dan stop awal ikut baris pembuka. Baris penutup membawa hasilnya.
  const link = randomUUID();
  await db()`
    insert into journal_trades
      (user_id, asset_id, side, direction, qty, price, fee, usd_idr, traded_at, stop_loss, take_profit, pnl_manual, link_id, setup, emotion, notes, tags)
    values
      (${userId}, ${asset.id}::bigint, ${v.side}, ${v.direction}, ${v.qty}::numeric, ${v.price}::numeric, ${v.fee}::numeric,
       ${entryRate}::numeric, to_timestamp(${v.tradedAt}::double precision / 1000),
       ${v.riskStop}::numeric, null, null, ${link}::text, ${v.setup}::text, ${v.emotion}::text, ${v.notes}::text, ${v.tags}::text[]),
      (${userId}, ${asset.id}::bigint, ${closeSide}, ${v.direction}, ${v.qty}::numeric, ${v.closePrice}::numeric, ${v.feeClose}::numeric,
       ${closeRate}::numeric, to_timestamp(${v.closeAt}::double precision / 1000),
       null, null, ${v.pnlManual}::numeric, ${link}::text, null, null, null, '{}'::text[])`;
  return { ok: true, asset };
}

export type RemoveResult = { ok: true } | { ok: false; code: "missing" | "oversell" };

/** Menghapus transaksi. Pasangan entry dan close dari "tandai close" selalu dihapus bersamaan. */
export async function removeTrade(userId: string, tradeId: number): Promise<RemoveResult> {
  const owned = await db()`
    select asset_id::text as asset_id, link_id from journal_trades where id = ${tradeId}::bigint and user_id = ${userId}`;
  if (!owned[0]) return { ok: false, code: "missing" };

  const assetId = Number(owned[0].asset_id);
  const link: string | null = owned[0].link_id ?? null;

  const all = (await loadTradeRows(userId)).filter((r) => r.assetId === assetId);
  const removing = new Set<number>([tradeId]);
  if (link) for (const r of all) if (r.linkId === link) removing.add(r.id);

  if (findOversell(all.filter((r) => !removing.has(r.id)))) return { ok: false, code: "oversell" };

  await db()`
    delete from journal_trades
    where user_id = ${userId} and (id = ${tradeId}::bigint or (link_id is not null and link_id = ${link}::text))`;
  return { ok: true };
}

/* ============================================================
 * Tombol "Tutup" pada posisi terbuka
 * ============================================================ */

export type CloseTarget = {
  assetId: number;
  symbol: string;
  assetClass: AssetClass;
  ccy: Ccy;
  direction: Direction;
  /** Jumlah yang masih terbuka (satuan terkecil). */
  qty: number;
  /** Harga rata rata dalam mata uang aset (long: termasuk fee beli, short: harga jual bersih). */
  avgPrice: number;
  /** Stop awal posisi untuk R, bila ada. */
  stop: number | null;
  /** Harga terkini bila tersedia, kalau tidak harga transaksi terakhir. */
  price: number;
  chain: string | null;
  contract: string | null;
};

/** Bahan pengisian form untuk menutup satu posisi (long atau short). null bila posisinya tidak ada lagi. */
export async function getCloseTarget(userId: string, assetId: number, direction: Direction = "long"): Promise<CloseTarget | null> {
  const rows = (await loadTradeRows(userId)).filter((r) => r.assetId === assetId);
  if (rows.length === 0) return null;

  const first = rows[0];
  const meta: AssetMeta = { id: assetId, symbol: first.symbol, name: first.name, assetClass: first.assetClass, ccy: first.ccy };
  const summary = summarize(rows, new Map([[assetId, meta]]), buildMarket(rows, new Map(), []), "IDR", Date.now());
  const position = summary.positions.find((p) => p.direction === direction);
  if (!position) return null;

  const quotes = await withTimeout(fetchQuotes(openTargets(rows), 15_000), 1500, new Map());
  return {
    assetId,
    symbol: first.symbol,
    assetClass: first.assetClass,
    ccy: first.ccy,
    direction,
    qty: position.qty,
    avgPrice: position.avgPrice,
    stop: position.stop,
    price: quotes.get(assetId)?.price ?? position.price,
    chain: first.chain,
    contract: first.assetClass === "meme" ? first.priceRef : null,
  };
}

/* ============================================================
 * Portofolio live
 * ============================================================ */

/** Aset yang masih punya sisa posisi, sebagai target pengambilan harga. */
export function openTargets(rows: TradeRow[]): QuoteTarget[] {
  const held = new Map<string, number>();
  const meta = new Map<number, TradeRow>();
  for (const r of [...rows].sort((a, b) => a.t - b.t || a.id - b.id)) {
    const key = `${r.assetId}:${r.direction}`;
    held.set(key, (held.get(key) ?? 0) + (isOpening(r.direction, r.side) ? r.qty : -r.qty));
    meta.set(r.assetId, r);
  }

  const openAssets = new Set<number>();
  for (const [key, qty] of held) {
    const assetId = Number(key.split(":")[0]);
    const r = meta.get(assetId);
    if (r && qty > 1e-9 * Math.max(1, r.qty)) openAssets.add(assetId);
  }
  return [...openAssets].map((assetId) => {
    const r = meta.get(assetId) as TradeRow;
    return { assetId, assetClass: r.assetClass, symbol: r.symbol, chain: r.chain, priceRef: r.priceRef };
  });
}

const withTimeout = <T,>(job: Promise<T>, ms: number, fallback: T) =>
  Promise.race([job, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

export type PortfolioData = {
  totalTrades: number;
  totals: Summary["totals"];
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
  /** Batas tunggu harga terkini. Dashboard memakai batas pendek agar halaman cepat. */
  liveTimeoutMs?: number;
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
    withTimeout(fetchQuotes(targets, opts.maxAgeMs), opts.liveTimeoutMs ?? 3500, new Map()),
    withTimeout(fetchUsdIdrLive(opts.maxAgeMs), opts.liveTimeoutMs ?? 3500, null),
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
      direction: p.direction,
      qty: p.qty,
      avgPrice: p.avgPrice,
      costReport: p.cost,
      price: p.price,
      value: p.value,
      unrealizedPct: p.unrealizedPct,
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
    totals: summary.totals,
    positions,
    realized: summary.totals.realized,
    usdIdr: fxMarks.length ? fxMarks[fxMarks.length - 1].v : 1,
    equity,
    liveLoaded: quotes.size > 0,
  };
}

/* ============================================================
 * Kalender PnL
 * ============================================================ */

const WIB_MS = 7 * 60 * 60 * 1000;
const wibDay = (ms: number) => new Date(ms + WIB_MS).toISOString().slice(0, 10);

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type CalendarData = {
  days: Record<string, CalendarDay>;
  todayKey: string;
  minMonth: string;
  maxMonth: string;
  /** true bila ada riwayat lebih lama yang disembunyikan karena batas paket. */
  limited: boolean;
};

/** Untung rugi terealisasi per hari (tanggal WIB). Data di luar batas paket tidak ikut dikirim. */
export async function getCalendar(opts: { userId: string; report: Ccy; months: number | null }): Promise<CalendarData> {
  const rows = await loadTradeRows(opts.userId);
  const now = Date.now();
  const todayKey = wibDay(now);
  const maxMonth = todayKey.slice(0, 7);

  const earliest = rows.length ? wibDay(rows[0].t).slice(0, 7) : maxMonth;
  const windowStart = opts.months === null ? earliest : shiftMonth(maxMonth, -(opts.months - 1));
  const minMonth = windowStart < earliest ? earliest : windowStart;
  const limited = opts.months !== null && earliest < windowStart;

  const assets = new Map<number, AssetMeta>();
  for (const r of rows) {
    assets.set(r.assetId, { id: r.assetId, symbol: r.symbol, name: r.name, assetClass: r.assetClass, ccy: r.ccy });
  }
  const summary = summarize(rows, assets, buildMarket(rows, new Map(), []), opts.report, now);

  const days: Record<string, CalendarDay> = {};
  const bucket = (key: string) => (days[key] ??= { pnl: 0, wins: 0, losses: 0, buys: 0, trades: [] });

  for (const c of summary.closed) {
    const key = wibDay(c.t);
    if (key.slice(0, 7) < minMonth) continue;
    const day = bucket(key);
    day.pnl += c.pnl;
    if (c.pnl > 0) day.wins += 1;
    else if (c.pnl < 0) day.losses += 1;
    day.trades.push({
      symbol: c.symbol,
      assetClass: assets.get(c.assetId)?.assetClass ?? "idx",
      direction: c.direction,
      qty: c.qty,
      pnl: c.pnl,
      pnlPct: c.pnlPct,
      r: c.r,
      manual: c.manual,
    });
  }
  for (const r of rows) {
    if (r.side !== "buy") continue;
    const key = wibDay(r.t);
    if (key.slice(0, 7) >= minMonth) bucket(key).buys += 1;
  }

  return { days, todayKey, minMonth, maxMonth, limited };
}

/* ============================================================
 * Analisis risiko dan kinerja dari jurnal (rupiah)
 * ============================================================ */

export type JournalAnalytics = {
  /** Jumlah hari data sejak transaksi pertama. */
  days: number;
  returnLabel: string;
  periodReturn: number;
  /** null bila data kurang dari 10 hari. */
  volatility: number | null;
  /** null bila data kurang dari 90 hari (return jangka pendek yang ditahunkan menyesatkan). */
  sharpe: number | null;
  maxDrawdown: number;
  classes: { label: string; value: number; share: number }[];
  contributors: { symbol: string; name: string; pnl: number; pnlPct: number }[];
};

const RISK_FREE_PCT = 6;
const YEAR_DAYS = 365;
const SHARPE_MIN_DAYS = 90;

/** Return TWR, volatilitas, Sharpe, drawdown, alokasi, dan kontributor, semuanya dari jurnal. */
export async function getAnalytics(userId: string): Promise<JournalAnalytics> {
  const rows = await loadTradeRows(userId);

  const assets = new Map<number, AssetMeta>();
  for (const r of rows) {
    assets.set(r.assetId, { id: r.assetId, symbol: r.symbol, name: r.name, assetClass: r.assetClass, ccy: r.ccy });
  }
  const [priceRows, fxRows] = await Promise.all([loadPriceRows([...assets.keys()]), loadFxRows()]);
  const market = buildMarket(rows, priceRows, fxRows);

  const now = Date.now();
  const endDay = dayFloor(now);
  const summary = summarize(rows, assets, market, "IDR", now);
  const all = sliceEquity(buildEquity(rows, assets, market, "IDR", endDay), 36_500, endDay, true);

  const index = all.points.map((p) => 1 + (p.twr ?? 0) / 100);
  const daily = index.slice(1).map((v, i) => v / index[i] - 1);
  const days = all.points.length;

  const mean = daily.length ? daily.reduce((a, b) => a + b, 0) / daily.length : 0;
  const stdev = daily.length ? Math.sqrt(daily.reduce((a, r) => a + (r - mean) ** 2, 0) / daily.length) : 0;
  const volatility = days >= 10 ? stdev * Math.sqrt(YEAR_DAYS) * 100 : null;

  const yearly = days >= YEAR_DAYS ? sliceEquity(buildEquity(rows, assets, market, "IDR", endDay), YEAR_DAYS, endDay, true) : all;
  const periodReturn = yearly.twr;

  let sharpe: number | null = null;
  if (days >= SHARPE_MIN_DAYS && volatility && volatility > 0) {
    const annualized = ((1 + all.twr / 100) ** (YEAR_DAYS / days) - 1) * 100;
    sharpe = (annualized - RISK_FREE_PCT) / volatility;
  }

  return {
    days,
    returnLabel: days >= YEAR_DAYS ? "Return 1 tahun" : `Return sejak mulai (${days} hari)`,
    periodReturn,
    volatility,
    sharpe,
    maxDrawdown: all.maxDrawdown,
    classes: summary.byClass.map((c) => ({ label: CLASS_LABEL[c.assetClass], value: c.value, share: c.share })),
    contributors: summary.pnlByAsset,
  };
}
