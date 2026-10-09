/**
 * Semua rumus jurnal ada di sini. Fungsi murni tanpa akses database atau jaringan,
 * jadi mudah diuji dan aman dipanggil dari mana saja.
 *
 * Mata uang: setiap transaksi dicatat dalam mata uang aset (IDR atau USD, USDT dianggap 1:1 USD).
 * Laporan dihitung dalam mata uang laporan (IDR atau USD). Modal dikonversi memakai kurs saat
 * transaksi, nilai pasar memakai kurs hari yang dihitung, jadi efek kurs ikut terbaca.
 */
import type { AssetClass, Ccy, EquityPoint } from "./shared";

export const DAY_MS = 86_400_000;

export type TradeInput = {
  id: number;
  assetId: number;
  symbol: string;
  side: "buy" | "sell";
  /** Selalu dalam satuan terkecil (lembar untuk saham IDX). */
  qty: number;
  price: number;
  fee: number;
  /** Rupiah per 1 USD saat transaksi. */
  usdIdr: number;
  t: number;
  stopLoss: number | null;
};

export type AssetMeta = {
  id: number;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  ccy: Ccy;
};

export type Mark = { t: number; v: number };

export const dayFloor = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS;

/** Berapa 1 satuan `from` dalam `to`. */
export function convRate(from: Ccy, to: Ccy, usdIdr: number): number {
  if (from === to) return 1;
  return from === "USD" ? usdIdr : 1 / usdIdr;
}

export const sortTrades = <T extends { t: number; id: number }>(trades: T[]): T[] =>
  [...trades].sort((a, b) => a.t - b.t || a.id - b.id);

/* ============================================================
 * Posisi (harga rata rata bergerak)
 * ============================================================ */

type PositionState = {
  qty: number;
  /** Total modal dalam mata uang aset (termasuk fee beli). */
  costNative: number;
  /** Total modal dalam mata uang laporan, dikunci pada kurs saat beli. */
  costReport: number;
  stop: number | null;
};

const emptyState = (): PositionState => ({ qty: 0, costNative: 0, costReport: 0, stop: null });

export type ClosedTrade = {
  tradeId: number;
  assetId: number;
  symbol: string;
  t: number;
  qty: number;
  /** Untung rugi dalam mata uang laporan, setelah fee. */
  pnl: number;
  /** Untung rugi dalam persen terhadap modal bagian yang dijual. */
  pnlPct: number;
  /** Kelipatan risiko (R). null jika stop loss tidak diisi. */
  r: number | null;
  /** Bagian pnl yang berasal dari pergerakan kurs. */
  fxEffect: number;
};

/**
 * Menerapkan satu transaksi ke state posisi.
 * Beli : modal bertambah (harga x qty + fee).
 * Jual : pnl = hasil jual bersih dikurangi (qty x harga rata rata).
 */
function applyTrade(state: PositionState, tr: TradeInput, ccy: Ccy, report: Ccy): ClosedTrade | null {
  const rate = convRate(ccy, report, tr.usdIdr);

  if (tr.side === "buy") {
    const cost = tr.qty * tr.price + tr.fee;
    state.qty += tr.qty;
    state.costNative += cost;
    state.costReport += cost * rate;
    if (tr.stopLoss !== null) state.stop = tr.stopLoss;
    return null;
  }

  const qty = Math.min(tr.qty, state.qty);
  if (qty <= 0) return null;

  const avgNative = state.costNative / state.qty;
  const avgReport = state.costReport / state.qty;
  const fee = tr.fee * (qty / tr.qty);

  const proceedsNative = qty * tr.price - fee;
  const costNative = qty * avgNative;
  const pnlNative = proceedsNative - costNative;
  const pnlReport = proceedsNative * rate - qty * avgReport;

  const risk = state.stop !== null && state.stop < avgNative ? (avgNative - state.stop) * qty : null;

  state.qty -= qty;
  state.costNative -= costNative;
  state.costReport -= qty * avgReport;
  if (state.qty <= 1e-9 * tr.qty) Object.assign(state, emptyState());

  return {
    tradeId: tr.id,
    assetId: tr.assetId,
    symbol: tr.symbol,
    t: tr.t,
    qty,
    pnl: pnlReport,
    pnlPct: costNative > 0 ? (pnlNative / costNative) * 100 : 0,
    r: risk === null ? null : pnlNative / risk,
    fxEffect: pnlReport - pnlNative * rate,
  };
}

/** Transaksi jual pertama yang membuat posisi minus (jual lebih banyak dari yang dimiliki). */
export function findOversell(trades: TradeInput[]): TradeInput | null {
  const qtyByAsset = new Map<number, number>();
  for (const tr of sortTrades(trades)) {
    const held = qtyByAsset.get(tr.assetId) ?? 0;
    if (tr.side === "buy") {
      qtyByAsset.set(tr.assetId, held + tr.qty);
      continue;
    }
    if (tr.qty > held * (1 + 1e-9) + 1e-12) return tr;
    qtyByAsset.set(tr.assetId, held - tr.qty);
  }
  return null;
}

/* ============================================================
 * Harga dan kurs per tanggal
 * ============================================================ */

export type Market = {
  /** Harga per aset: harga penutupan, ditambah harga transaksi untuk hari yang belum ada datanya. */
  price: Map<number, Mark[]>;
  /** Hanya harga penutupan dari sumber data. */
  closes: Map<number, Mark[]>;
  /** Kurs USD ke IDR. */
  fx: Mark[];
  /** Aset yang harganya berasal dari kutipan terkini (bukan data harian atau transaksi). */
  live: Set<number>;
};

function mergeMarks(rows: Mark[], extra: Mark[]): Mark[] {
  const covered = new Set(rows.map((m) => dayFloor(m.t)));
  const merged = [...rows, ...extra.filter((m) => !covered.has(dayFloor(m.t)))];
  return merged.sort((a, b) => a.t - b.t);
}

export function buildMarket(trades: TradeInput[], priceRows: Map<number, Mark[]>, fxRows: Mark[]): Market {
  const price = new Map<number, Mark[]>();
  const closes = new Map<number, Mark[]>();
  const byAsset = new Map<number, Mark[]>();

  for (const tr of trades) {
    const list = byAsset.get(tr.assetId) ?? [];
    list.push({ t: tr.t, v: tr.price });
    byAsset.set(tr.assetId, list);
  }
  for (const [assetId, tradeMarks] of byAsset) {
    const rows = [...(priceRows.get(assetId) ?? [])].sort((a, b) => a.t - b.t);
    closes.set(assetId, rows);
    price.set(assetId, mergeMarks(rows, tradeMarks));
  }

  const fx = mergeMarks(
    [...fxRows].sort((a, b) => a.t - b.t),
    trades.map((tr) => ({ t: tr.t, v: tr.usdIdr })),
  );
  return { price, closes, fx, live: new Set() };
}

/** Menambahkan harga dan kurs terkini sebagai titik data terbaru. */
export function withLive(market: Market, prices: Map<number, number>, usdIdr: number | null, now: number): Market {
  const price = new Map(market.price);
  for (const [assetId, v] of prices) {
    price.set(
      assetId,
      [...(price.get(assetId) ?? []), { t: now, v }].sort((a, b) => a.t - b.t),
    );
  }
  const fx = usdIdr ? [...market.fx, { t: now, v: usdIdr }].sort((a, b) => a.t - b.t) : market.fx;
  return { price, closes: market.closes, fx, live: new Set(prices.keys()) };
}

/** Nilai terakhir pada atau sebelum `t`. Jika belum ada data, pakai data paling awal. */
function markAt(marks: Mark[] | undefined, t: number): number | null {
  if (!marks || marks.length === 0) return null;
  let lo = 0;
  let hi = marks.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (marks[mid].t <= t) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return marks[found === -1 ? 0 : found].v;
}

/* ============================================================
 * Ringkasan portofolio
 * ============================================================ */

export type PositionView = {
  assetId: number;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  ccy: Ccy;
  qty: number;
  /** Harga rata rata dalam mata uang aset. */
  avgPrice: number;
  /** Harga terakhir dalam mata uang aset. */
  price: number;
  /** true bila harga diambil dari transaksi terakhir (data pasar belum ada atau sudah lama). */
  priceFromTrade: boolean;
  value: number;
  cost: number;
  unrealized: number;
  unrealizedPct: number;
  realized: number;
  share: number;
};

export type Summary = {
  positions: PositionView[];
  closed: ClosedTrade[];
  totals: {
    value: number;
    cost: number;
    unrealized: number;
    unrealizedPct: number;
    realized: number;
    fxEffect: number;
  };
  byClass: { assetClass: AssetClass; value: number; share: number }[];
  /** Untung rugi total (terealisasi + belum) per aset, termasuk aset yang sudah habis dijual. */
  pnlByAsset: { symbol: string; pnl: number }[];
};

const STALE_AFTER_MS = 4 * DAY_MS;

export function summarize(
  trades: TradeInput[],
  assets: Map<number, AssetMeta>,
  market: Market,
  report: Ccy,
  now: number,
): Summary {
  const states = new Map<number, PositionState>();
  const closed: ClosedTrade[] = [];

  for (const tr of sortTrades(trades)) {
    const asset = assets.get(tr.assetId);
    if (!asset) continue;
    const state = states.get(tr.assetId) ?? emptyState();
    states.set(tr.assetId, state);
    const result = applyTrade(state, tr, asset.ccy, report);
    if (result) closed.push(result);
  }

  const usdIdrNow = markAt(market.fx, now) ?? 1;
  const realizedByAsset = new Map<number, number>();
  for (const c of closed) realizedByAsset.set(c.assetId, (realizedByAsset.get(c.assetId) ?? 0) + c.pnl);

  const positions: PositionView[] = [];
  for (const [assetId, state] of states) {
    const asset = assets.get(assetId);
    if (!asset || state.qty <= 0) continue;

    const avgPrice = state.costNative / state.qty;
    const price = markAt(market.price.get(assetId), now) ?? avgPrice;
    const lastClose = market.closes.get(assetId)?.at(-1);
    const priceFromTrade = !market.live.has(assetId) && (!lastClose || now - lastClose.t > STALE_AFTER_MS);

    const value = state.qty * price * convRate(asset.ccy, report, usdIdrNow);
    const unrealized = value - state.costReport;

    positions.push({
      assetId,
      symbol: asset.symbol,
      name: asset.name,
      assetClass: asset.assetClass,
      ccy: asset.ccy,
      qty: state.qty,
      avgPrice,
      price,
      priceFromTrade,
      value,
      cost: state.costReport,
      unrealized,
      unrealizedPct: state.costReport > 0 ? (unrealized / state.costReport) * 100 : 0,
      realized: realizedByAsset.get(assetId) ?? 0,
      share: 0,
    });
  }

  const value = positions.reduce((sum, p) => sum + p.value, 0);
  const cost = positions.reduce((sum, p) => sum + p.cost, 0);
  const unrealized = value - cost;
  for (const p of positions) p.share = value > 0 ? (p.value / value) * 100 : 0;
  positions.sort((a, b) => b.value - a.value);

  const classValue = new Map<AssetClass, number>();
  for (const p of positions) classValue.set(p.assetClass, (classValue.get(p.assetClass) ?? 0) + p.value);
  const byClass = [...classValue.entries()]
    .map(([assetClass, v]) => ({ assetClass, value: v, share: value > 0 ? (v / value) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  const pnlByAssetMap = new Map<number, number>(realizedByAsset);
  for (const p of positions) pnlByAssetMap.set(p.assetId, (pnlByAssetMap.get(p.assetId) ?? 0) + p.unrealized);
  const pnlByAsset = [...pnlByAssetMap.entries()]
    .map(([assetId, pnl]) => ({ symbol: assets.get(assetId)?.symbol ?? "?", pnl }))
    .sort((a, b) => b.pnl - a.pnl);

  return {
    positions,
    closed,
    totals: {
      value,
      cost,
      unrealized,
      unrealizedPct: cost > 0 ? (unrealized / cost) * 100 : 0,
      realized: closed.reduce((sum, c) => sum + c.pnl, 0),
      fxEffect: closed.reduce((sum, c) => sum + c.fxEffect, 0),
    },
    byClass,
    pnlByAsset,
  };
}

/* ============================================================
 * Statistik transaksi tertutup
 * ============================================================ */

export type TradeStats = {
  count: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  /** Total untung dibagi total rugi. null jika belum ada transaksi rugi. */
  profitFactor: number | null;
  /** Rata rata hasil per transaksi: winRate x avgWin dikurangi (1 - winRate) x avgLoss. */
  expectancy: number;
  avgR: number | null;
};

export function tradeStats(closed: ClosedTrade[]): TradeStats {
  const wins = closed.filter((c) => c.pnl > 0);
  const losses = closed.filter((c) => c.pnl < 0);
  const grossWin = wins.reduce((sum, c) => sum + c.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, c) => sum + c.pnl, 0));
  const count = closed.length;

  const winRate = count ? wins.length / count : 0;
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;

  const withR = closed.filter((c) => c.r !== null);
  return {
    count,
    winRate: winRate * 100,
    avgWin,
    avgLoss,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    expectancy: winRate * avgWin - (1 - winRate) * avgLoss,
    avgR: withR.length ? withR.reduce((sum, c) => sum + (c.r ?? 0), 0) / withR.length : null,
  };
}

/* ============================================================
 * Kurva ekuitas harian
 * ============================================================ */

type EquityDay = { t: number; value: number; pnl: number; index: number };

/**
 * Memutar ulang transaksi hari demi hari.
 *   Nilai       = jumlah (qty x harga penutupan x kurs hari itu)
 *   Untung rugi = untung terealisasi kumulatif + (nilai dikurangi modal)
 *   Return      = TWR harian: (nilai hari ini dikurangi arus beli/jual hari ini) / nilai kemarin, lalu dirantai.
 */
export function buildEquity(
  trades: TradeInput[],
  assets: Map<number, AssetMeta>,
  market: Market,
  report: Ccy,
  endDay: number,
): EquityDay[] {
  const sorted = sortTrades(trades);
  if (sorted.length === 0) return [];

  const states = new Map<number, PositionState>();
  const days: EquityDay[] = [];
  let cursor = 0;
  let realized = 0;
  let index = 1;
  let prevValue = 0;

  for (let day = dayFloor(sorted[0].t); day <= endDay; day += DAY_MS) {
    const dayEnd = day + DAY_MS - 1;
    const usdIdr = markAt(market.fx, dayEnd) ?? 1;
    let flow = 0;

    while (cursor < sorted.length && sorted[cursor].t <= dayEnd) {
      const tr = sorted[cursor++];
      const asset = assets.get(tr.assetId);
      if (!asset) continue;
      const state = states.get(tr.assetId) ?? emptyState();
      states.set(tr.assetId, state);

      const result = applyTrade(state, tr, asset.ccy, report);
      const rate = convRate(asset.ccy, report, usdIdr);
      if (tr.side === "buy") flow += tr.qty * tr.price * rate;
      else if (result) {
        realized += result.pnl;
        flow -= result.qty * tr.price * rate;
      }
    }

    let value = 0;
    let cost = 0;
    for (const [assetId, state] of states) {
      const asset = assets.get(assetId);
      if (!asset || state.qty <= 0) continue;
      const price = markAt(market.price.get(assetId), dayEnd) ?? state.costNative / state.qty;
      value += state.qty * price * convRate(asset.ccy, report, usdIdr);
      cost += state.costReport;
    }

    if (prevValue > 0) index *= (value - flow) / prevValue;
    prevValue = value;
    days.push({ t: day, value, pnl: realized + (value - cost), index });
  }
  return days;
}

export const RANGE_DAYS = { "1D": 1, "1W": 7, "1M": 30, "6M": 182, "1Y": 365 } as const;

export type EquitySlice = {
  points: EquityPoint[];
  /** Return TWR pada rentang ini (%). */
  twr: number;
  /** Penurunan terdalam dari puncak pada rentang ini (%), bernilai nol atau negatif. */
  maxDrawdown: number;
};

/** Memotong kurva sesuai rentang. Metrik premium hanya disertakan bila `premium` true. */
export function sliceEquity(days: EquityDay[], rangeDays: number, endDay: number, premium: boolean): EquitySlice {
  if (days.length === 0) return { points: [], twr: 0, maxDrawdown: 0 };

  const cutoff = endDay - rangeDays * DAY_MS;
  let picked = days.filter((d) => d.t >= cutoff);
  if (picked.length < 2) picked = days.slice(-2);

  const base = picked[0].index || 1;
  let peak = 1;
  let maxDrawdown = 0;

  const points = picked.map((d) => {
    const rebased = d.index / base;
    peak = Math.max(peak, rebased);
    const dd = (rebased / peak - 1) * 100;
    maxDrawdown = Math.min(maxDrawdown, dd);
    const point: EquityPoint = { t: d.t, value: d.value, pnl: d.pnl };
    if (premium) {
      point.twr = (rebased - 1) * 100;
      point.dd = dd;
    }
    return point;
  });

  const last = picked[picked.length - 1];
  return { points, twr: (last.index / base - 1) * 100, maxDrawdown };
}
