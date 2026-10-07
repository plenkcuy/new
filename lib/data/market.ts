import "server-only";
import { TIER_LIMITS } from "../plans";
import type { Holding, MarketIndex, MarketRow, Point, Range, WatchItem } from "./types";

/**
 * DATA TIRUAN (server-only). Semua fungsi async agar mudah diganti dengan
 * pemanggilan API/database sungguhan tanpa mengubah pemanggilnya.
 */

type Stock = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  views: number;
  volume: number;
  color: string;
};

const STOCKS: readonly Stock[] = [
  { symbol: "BBCA", name: "Bank Central Asia", sector: "Keuangan", price: 9850, change: 2.31, views: 980, volume: 84.2, color: "#5b8def" },
  { symbol: "TLKM", name: "Telkom Indonesia", sector: "Telekomunikasi", price: 3420, change: -1.12, views: 870, volume: 97.3, color: "#e2556b" },
  { symbol: "BBRI", name: "Bank Rakyat Indonesia", sector: "Keuangan", price: 4280, change: 0.84, views: 760, volume: 152.6, color: "#3fb68b" },
  { symbol: "ASII", name: "Astra International", sector: "Industri", price: 4730, change: 4.89, views: 640, volume: 61.8, color: "#d9a441" },
  { symbol: "GOTO", name: "GoTo Gojek Tokopedia", sector: "Teknologi", price: 68, change: -3.4, views: 590, volume: 1245, color: "#7bc96f" },
  { symbol: "BMRI", name: "Bank Mandiri", sector: "Keuangan", price: 5125, change: 0.39, views: 520, volume: 78.9, color: "#38bdf8" },
  { symbol: "ANTM", name: "Aneka Tambang", sector: "Pertambangan", price: 1675, change: 2.75, views: 450, volume: 210.4, color: "#f472b6" },
  { symbol: "UNVR", name: "Unilever Indonesia", sector: "Konsumen", price: 2310, change: 1.5, views: 410, volume: 23.4, color: "#8a7be0" },
  { symbol: "ICBP", name: "Indofood CBP", sector: "Konsumen", price: 11200, change: -0.44, views: 300, volume: 12.1, color: "#fb923c" },
];

const STOCK_BY_SYMBOL = new Map(STOCKS.map((stock) => [stock.symbol, stock]));

const POSITIONS = [
  { symbol: "BBCA", units: 5200, avgPrice: 9200 },
  { symbol: "BBRI", units: 9800, avgPrice: 4050 },
  { symbol: "TLKM", units: 8500, avgPrice: 3780 },
  { symbol: "ASII", units: 4200, avgPrice: 4200 },
  { symbol: "UNVR", units: 6400, avgPrice: 2650 },
  { symbol: "GOTO", units: 120_000, avgPrice: 82 },
] as const;

/** Saldo kas (non-saham). */
export const CASH = 19_276_450;

function stockOf(symbol: string): Stock {
  const stock = STOCK_BY_SYMBOL.get(symbol);
  if (!stock) throw new Error(`Saham tidak dikenal: ${symbol}`);
  return stock;
}

function totalAssets(): number {
  return POSITIONS.reduce((sum, p) => sum + p.units * stockOf(p.symbol).price, 0) + CASH;
}

export async function getHoldings(): Promise<Holding[]> {
  return POSITIONS.map((p) => {
    const s = stockOf(p.symbol);
    return {
      symbol: p.symbol,
      name: s.name,
      sector: s.sector,
      units: p.units,
      avgPrice: p.avgPrice,
      price: s.price,
      change: s.change,
      color: s.color,
    };
  }).sort((a, b) => b.units * b.price - a.units * a.price);
}

export type PortfolioSummary = {
  total: number;
  stocksValue: number;
  cash: number;
  cost: number;
  pnl: number;
  pnlPct: number;
};

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const holdings = await getHoldings();
  const stocksValue = holdings.reduce((sum, h) => sum + h.units * h.price, 0);
  const cost = holdings.reduce((sum, h) => sum + h.units * h.avgPrice, 0);
  const pnl = stocksValue - cost;
  return { total: stocksValue + CASH, stocksValue, cash: CASH, cost, pnl, pnlPct: (pnl / cost) * 100 };
}

/* ---------- Grafik performa ---------- */

const BASE = Date.UTC(2026, 9, 7, 12, 0, 0);
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const SERIES_CONFIG: Record<Range, { points: number; step: number; vol: number; drift: number; seed: number }> = {
  "1D": { points: 48, step: 30 * MIN, vol: 0.0035, drift: 0.0002, seed: 11 },
  "1W": { points: 56, step: 3 * HOUR, vol: 0.006, drift: 0.0004, seed: 23 },
  "1M": { points: 30, step: DAY, vol: 0.012, drift: 0.001, seed: 37 },
  "6M": { points: 26, step: 7 * DAY, vol: 0.03, drift: 0.004, seed: 41 },
  "1Y": { points: 52, step: 7 * DAY, vol: 0.035, drift: 0.003, seed: 59 },
};

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Deret waktu tiruan (deterministik) yang selalu berakhir di total aset saat ini. */
export async function getPerformanceSeries(range: Range): Promise<Point[]> {
  const { points, step, vol, drift, seed } = SERIES_CONFIG[range];
  const rand = seededRandom(seed);
  const raw: number[] = [1];
  for (let i = 1; i < points; i++) {
    const shock = (rand() - 0.5) * 2 * vol;
    raw.push(raw[i - 1] * (1 + drift + shock));
  }
  const scale = totalAssets() / raw[raw.length - 1];
  return raw.map((v, i) => ({ t: BASE - (points - 1 - i) * step, value: Math.round(v * scale) }));
}

/* ---------- Watchlist & pasar ---------- */

function toWatchItem(s: Stock): WatchItem {
  return { symbol: s.symbol, name: s.name, exchange: "IDX", price: s.price, change: s.change, views: s.views, color: s.color };
}

/** Watchlist dibatasi `limit`; `lockedCount` = berapa saham yang terkunci oleh tier. */
export async function getWatchlist(limit: number): Promise<{ items: WatchItem[]; lockedCount: number }> {
  const pool = [...STOCKS].sort((a, b) => b.views - a.views).slice(0, TIER_LIMITS.premium.watchlistItems);
  const items = pool.slice(0, limit).map(toWatchItem);
  return { items, lockedCount: pool.length - items.length };
}

export async function getMarketOverview(): Promise<{ indices: MarketIndex[]; rows: MarketRow[] }> {
  const indices: MarketIndex[] = [
    { code: "IHSG", name: "Indeks Harga Saham Gabungan", value: 7842.15, change: 0.62 },
    { code: "LQ45", name: "LQ45", value: 985.4, change: -0.18 },
    { code: "IDX30", name: "IDX30", value: 512.77, change: 0.35 },
    { code: "JII", name: "Jakarta Islamic Index", value: 548.2, change: 0.21 },
  ];
  const rows: MarketRow[] = [...STOCKS]
    .sort((a, b) => b.volume - a.volume)
    .map((s) => ({
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      price: s.price,
      change: s.change,
      volume: s.volume,
      color: s.color,
    }));
  return { indices, rows };
}
