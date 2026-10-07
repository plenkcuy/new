/**
 * Entitlement per tier: fitur apa yang boleh dipakai dan batasnya.
 * Ubah di sini, seluruh aplikasi (UI + server) ikut berubah.
 */
import { hasTier } from "./auth/tiers";
import type { Tier } from "./auth/types";
import { RANGES, type Range } from "./data/types";

/** Tier minimum untuk tiap fitur. */
export const FEATURE_MIN_TIER = {
  "ai-insights": "premium",
  "advanced-analytics": "premium",
  community: "premium",
  "export-csv": "premium",
  "admin-panel": "admin",
} as const satisfies Record<string, Tier>;

export type Feature = keyof typeof FEATURE_MIN_TIER;

export function can(tier: Tier, feature: Feature): boolean {
  return hasTier(tier, FEATURE_MIN_TIER[feature]);
}

export type TierLimits = {
  /** Jumlah saham pada watchlist. */
  watchlistItems: number;
  /** Rentang grafik performa yang boleh dipilih. */
  chartRanges: readonly Range[];
  defaultRange: Range;
  marketFeed: "delayed" | "realtime";
};

const FREE_RANGES: readonly Range[] = ["1D", "1W", "1M"];

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: { watchlistItems: 3, chartRanges: FREE_RANGES, defaultRange: "1M", marketFeed: "delayed" },
  premium: { watchlistItems: 5, chartRanges: RANGES, defaultRange: "1Y", marketFeed: "realtime" },
  admin: { watchlistItems: 5, chartRanges: RANGES, defaultRange: "1Y", marketFeed: "realtime" },
};

export const limitsFor = (tier: Tier): TierLimits => TIER_LIMITS[tier];

/** Harga contoh untuk halaman upgrade dan estimasi MRR admin. Ganti sesuai bisnis. */
export const PREMIUM_PRICE_IDR = 99_000;

export type ComparisonRow = { label: string; free: string; premium: string };

export function getPlanComparison(): ComparisonRow[] {
  const free = TIER_LIMITS.free;
  const premium = TIER_LIMITS.premium;
  const yes = "✓";
  const no = "—";
  const flag = (feature: Feature) => (hasTier("free", FEATURE_MIN_TIER[feature]) ? yes : no);
  const range = (r: readonly Range[]) => `${r[0]}–${r[r.length - 1]}`;

  return [
    { label: "Dashboard, portofolio, dan pasar", free: yes, premium: yes },
    { label: "Rentang grafik performa", free: range(free.chartRanges), premium: range(premium.chartRanges) },
    { label: "Saham di watchlist", free: String(free.watchlistItems), premium: String(premium.watchlistItems) },
    { label: "Feed data pasar", free: "Tertunda", premium: "Real-time" },
    { label: "Insight AI", free: flag("ai-insights"), premium: yes },
    { label: "Analisis lanjutan", free: flag("advanced-analytics"), premium: yes },
    { label: "Komunitas", free: flag("community"), premium: yes },
    { label: "Ekspor portofolio (CSV)", free: flag("export-csv"), premium: yes },
  ];
}
