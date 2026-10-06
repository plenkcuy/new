export type Range = "1D" | "1W" | "1M" | "6M" | "1Y";
export const RANGES: Range[] = ["1D", "1W", "1M", "6M", "1Y"];

export type Point = { t: number; value: number };

/** Total aset (data tiruan). */
export const TOTAL_HOLDING = 184_320_450;

// Tanggal acuan tetap agar render server & client identik.
const BASE = Date.UTC(2026, 9, 7, 12, 0, 0);
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const CONFIG: Record<Range, { points: number; step: number; vol: number; drift: number; seed: number }> = {
  "1D": { points: 48, step: 30 * MIN, vol: 0.0035, drift: 0.0002, seed: 11 },
  "1W": { points: 56, step: 3 * HOUR, vol: 0.006, drift: 0.0004, seed: 23 },
  "1M": { points: 30, step: DAY, vol: 0.012, drift: 0.001, seed: 37 },
  "6M": { points: 26, step: 7 * DAY, vol: 0.03, drift: 0.004, seed: 41 },
  "1Y": { points: 52, step: 7 * DAY, vol: 0.035, drift: 0.003, seed: 59 },
};

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const cache = new Map<Range, Point[]>();

/** Deret waktu tiruan (deterministik) yang selalu berakhir di TOTAL_HOLDING. */
export function getSeries(range: Range): Point[] {
  const hit = cache.get(range);
  if (hit) return hit;
  const { points, step, vol, drift, seed } = CONFIG[range];
  const rand = rng(seed);
  const raw: number[] = [1];
  for (let i = 1; i < points; i++) {
    const shock = (rand() - 0.5) * 2 * vol;
    raw.push(raw[i - 1] * (1 + drift + shock));
  }
  const scale = TOTAL_HOLDING / raw[raw.length - 1];
  const series = raw.map((v, i) => ({
    t: BASE - (points - 1 - i) * step,
    value: Math.round(v * scale),
  }));
  cache.set(range, series);
  return series;
}

export function changePct(range: Range) {
  const s = getSeries(range);
  return ((s[s.length - 1].value - s[0].value) / s[0].value) * 100;
}

export type WatchItem = {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  views: number;
  color: string;
};

export const WATCHLIST: WatchItem[] = [
  { symbol: "BBCA", name: "Bank Central Asia", exchange: "IDX", price: 9850, change: 2.31, views: 980, color: "#5b8def" },
  { symbol: "TLKM", name: "Telkom Indonesia", exchange: "IDX", price: 3420, change: -1.12, views: 870, color: "#e2556b" },
  { symbol: "BBRI", name: "Bank Rakyat Indonesia", exchange: "IDX", price: 4280, change: 0.84, views: 760, color: "#3fb68b" },
  { symbol: "ASII", name: "Astra International", exchange: "IDX", price: 4730, change: 4.89, views: 640, color: "#d9a441" },
  { symbol: "GOTO", name: "GoTo Gojek Tokopedia", exchange: "IDX", price: 68, change: -3.4, views: 590, color: "#7bc96f" },
  { symbol: "UNVR", name: "Unilever Indonesia", exchange: "IDX", price: 2310, change: 1.5, views: 410, color: "#8a7be0" },
];

export type Holding = {
  symbol: string;
  units: number;
  price: number;
  change: number;
  color: string;
};

export const HOLDINGS: Holding[] = [
  { symbol: "BBCA", units: 1200, price: 9850, change: 2.31, color: "#5b8def" },
  { symbol: "ASII", units: 2500, price: 4730, change: 4.89, color: "#d9a441" },
  { symbol: "BBRI", units: 3100, price: 4280, change: 0.84, color: "#3fb68b" },
  { symbol: "TLKM", units: 4000, price: 3420, change: -1.12, color: "#e2556b" },
];
