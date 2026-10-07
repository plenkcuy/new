/** Tipe data domain. Aman diimpor dari server maupun client component. */

export const RANGES = ["1D", "1W", "1M", "6M", "1Y"] as const;
export type Range = (typeof RANGES)[number];

export function isRange(value: unknown): value is Range {
  return typeof value === "string" && (RANGES as readonly string[]).includes(value);
}

export type Point = { t: number; value: number };

export type WatchItem = {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  views: number;
  color: string;
};

export type Holding = {
  symbol: string;
  name: string;
  sector: string;
  units: number;
  /** Harga beli rata-rata per lembar. */
  avgPrice: number;
  price: number;
  /** Perubahan harian (%). */
  change: number;
  color: string;
};

export type MarketIndex = { code: string; name: string; value: number; change: number };

export type MarketRow = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  /** Volume dalam juta lembar. */
  volume: number;
  color: string;
};
