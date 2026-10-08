import "server-only";
import { userRepo } from "./auth";
import { PREMIUM_PRICE_IDR, TIER_LIMITS } from "./access";
import type { Holding, MarketIndex, MarketRow, Point, Post, Range, Tier, User, WatchItem } from "./shared";

/**
 * SEMUA DATA TIRUAN ada di file ini (server-only). Semua fungsi async agar
 * mudah diganti dengan pemanggilan API/database tanpa mengubah pemanggilnya.
 */

/* ============================================================
 * Pasar & portofolio
 * ============================================================ */

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

/* ============================================================
 * Analisis (dihitung dari deret tiruan 1 tahun). Bukan saran investasi.
 * ============================================================ */

export type Analytics = {
  /** Return 1 tahun (%). */
  annualReturn: number;
  /** Volatilitas tahunan (%). */
  volatility: number;
  sharpe: number;
  /** Penurunan maksimum (%), bernilai negatif. */
  maxDrawdown: number;
  sectors: { label: string; value: number; share: number }[];
  contributors: { symbol: string; name: string; pnl: number; pnlPct: number }[];
};

const RISK_FREE_PCT = 6;
const WEEKS_PER_YEAR = 52;
const average = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export async function getAnalytics(): Promise<Analytics> {
  const [series, holdings] = await Promise.all([getPerformanceSeries("1Y"), getHoldings()]);

  const returns = series.slice(1).map((p, i) => p.value / series[i].value - 1);
  const mean = average(returns);
  const stdev = Math.sqrt(average(returns.map((r) => (r - mean) ** 2)));

  const annualReturn = (series[series.length - 1].value / series[0].value - 1) * 100;
  const volatility = stdev * Math.sqrt(WEEKS_PER_YEAR) * 100;
  const sharpe = volatility === 0 ? 0 : (annualReturn - RISK_FREE_PCT) / volatility;

  let peak = series[0].value;
  let maxDrawdown = 0;
  for (const point of series) {
    peak = Math.max(peak, point.value);
    maxDrawdown = Math.min(maxDrawdown, (point.value / peak - 1) * 100);
  }

  const bySector = new Map<string, number>([["Kas", CASH]]);
  for (const h of holdings) bySector.set(h.sector, (bySector.get(h.sector) ?? 0) + h.units * h.price);
  const total = [...bySector.values()].reduce((a, b) => a + b, 0);
  const sectors = [...bySector.entries()]
    .map(([label, value]) => ({ label, value, share: (value / total) * 100 }))
    .sort((a, b) => b.value - a.value);

  const contributors = holdings
    .map((h) => ({
      symbol: h.symbol,
      name: h.name,
      pnl: h.units * (h.price - h.avgPrice),
      pnlPct: (h.price / h.avgPrice - 1) * 100,
    }))
    .sort((a, b) => b.pnl - a.pnl);

  return { annualReturn, volatility, sharpe, maxDrawdown, sectors, contributors };
}

/* ============================================================
 * Komunitas (konten tiruan, bukan saran investasi)
 * ============================================================ */

const POSTS: readonly Post[] = [
  {
    id: "p1",
    author: "Maya Putri",
    role: "Analis",
    time: "2 jam lalu",
    body: "Rilis kuartal terbaru sektor perbankan menunjukkan pertumbuhan kredit yang stabil. Menarik melihat bagaimana margin bunga bersih bergerak dalam beberapa kuartal ke depan.",
    likes: 42,
    replies: 9,
    tags: ["Perbankan", "Kuartalan"],
  },
  {
    id: "p2",
    author: "Citra Lestari",
    role: "Investor",
    time: "5 jam lalu",
    body: "Saya mulai mencatat alokasi per sektor setiap bulan. Ternyata porsi kas saya lebih besar dari yang saya kira. Ada yang punya template pencatatan yang praktis?",
    likes: 18,
    replies: 14,
    tags: ["Alokasi", "Pencatatan"],
  },
  {
    id: "p3",
    author: "Eka Nugroho",
    role: "Investor",
    time: "Kemarin",
    body: "Diskusi minggu ini: seberapa sering kalian meninjau ulang portofolio? Bulanan, kuartalan, atau hanya saat ada berita besar?",
    likes: 27,
    replies: 31,
    tags: ["Diskusi"],
  },
  {
    id: "p4",
    author: "Sinta Wijaya",
    role: "Analis",
    time: "2 hari lalu",
    body: "Pengingat: diversifikasi tidak menghilangkan risiko, tetapi dapat membantu menurunkan dampak satu emiten terhadap keseluruhan portofolio.",
    likes: 63,
    replies: 6,
    tags: ["Risiko", "Edukasi"],
  },
];

const TOPICS = [
  { tag: "Perbankan", posts: 128 },
  { tag: "Alokasi", posts: 96 },
  { tag: "Dividen", posts: 74 },
  { tag: "Edukasi", posts: 61 },
  { tag: "Risiko", posts: 45 },
];

export async function getPosts(): Promise<Post[]> {
  return [...POSTS];
}

export async function getTrendingTopics(): Promise<{ tag: string; posts: number }[]> {
  return [...TOPICS];
}

/* ============================================================
 * Admin
 * ============================================================ */

export async function getUsers(filter: Tier | "all" = "all"): Promise<User[]> {
  const users = await userRepo.list();
  return filter === "all" ? users : users.filter((user) => user.tier === filter);
}

export type AdminOverview = {
  total: number;
  byTier: Record<Tier, number>;
  suspended: number;
  /** Estimasi pendapatan bulanan berulang dari jumlah pengguna Premium. */
  mrr: number;
  health: { label: string; value: string; ok: boolean }[];
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const users = await userRepo.list();
  const byTier: Record<Tier, number> = { free: 0, premium: 0, admin: 0 };
  for (const user of users) byTier[user.tier] += 1;

  return {
    total: users.length,
    byTier,
    suspended: users.filter((user) => user.status === "suspended").length,
    mrr: byTier.premium * PREMIUM_PRICE_IDR,
    // Data tiruan. Sambungkan ke monitoring sungguhan (Grafana/Datadog/dsb).
    health: [
      { label: "Latensi API (p95)", value: "142 ms", ok: true },
      { label: "Tingkat error (24 jam)", value: "0,12%", ok: true },
      { label: "Antrean job", value: "3 menunggu", ok: true },
      { label: "Uptime (30 hari)", value: "99,97%", ok: true },
    ],
  };
}
