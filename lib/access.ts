/**
 * Aturan akses (SATU sumber kebenaran untuk middleware, sidebar, dan guard):
 *   1. Tier         siapa lebih tinggi dari siapa
 *   2. Rute         tab/halaman mana butuh tier apa
 *   3. Paket        fitur dan batas tiap tier
 * Aman di Edge. Jangan impor kode server-only di sini.
 */
import { RANGES, type Range, type Tier } from "./shared";

/* ============================================================
 * 1. Tier
 * ============================================================ */

/** Urutan dari terendah ke tertinggi. Admin otomatis mencakup hak Premium. */
export const TIERS = ["free", "premium", "admin"] as const satisfies readonly Tier[];

const RANK: Record<Tier, number> = { free: 0, premium: 1, admin: 2 };

export const TIER_LABEL: Record<Tier, string> = { free: "Free", premium: "Premium", admin: "Admin" };

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && (TIERS as readonly string[]).includes(value);
}

/** Apakah `current` memenuhi syarat minimal `required`? */
export function hasTier(current: Tier, required: Tier): boolean {
  return RANK[current] >= RANK[required];
}

/* ============================================================
 * 2. Rute
 * ============================================================ */

/** Rute tanpa login. Semua rute lain wajib login. */
export const PUBLIC_ROUTES = ["/login"] as const;

/**
 * Tier minimum per awalan rute. Rute yang tidak tercantum = "free" (cukup login).
 * Yang paling spesifik (awalan terpanjang) menang.
 */
export const ROUTE_RULES: ReadonlyArray<{ prefix: string; min: Tier }> = [
  { prefix: "/admin", min: "admin" },
  { prefix: "/analysis", min: "premium" },
  { prefix: "/community", min: "premium" },
  { prefix: "/api/export", min: "premium" },
];

/** Cocok pada batas segmen: "/admin" cocok dengan "/admin/x", bukan "/administrator". */
function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => matches(pathname, route));
}

export function requiredTierFor(pathname: string): Tier {
  let best: { prefix: string; min: Tier } | null = null;
  for (const rule of ROUTE_RULES) {
    if (matches(pathname, rule.prefix) && (!best || rule.prefix.length > best.prefix.length)) best = rule;
  }
  return best?.min ?? "free";
}

/** Tujuan redirect saat tier tidak cukup. Admin → 403, lainnya → halaman upgrade. */
export function deniedRedirect(required: Tier, from?: string): string {
  if (required === "admin") return "/forbidden";
  const params = new URLSearchParams({ required });
  if (from) params.set("from", from);
  return `/upgrade?${params.toString()}`;
}

/** Validasi tujuan redirect setelah login (cegah open redirect): hanya path internal. */
export function safeNext(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return fallback;
  if (isPublicRoute(value.split("?")[0])) return fallback;
  return value;
}

/* ============================================================
 * 3. Paket: fitur & batas per tier
 *    Ubah di sini, seluruh aplikasi (UI + server) ikut berubah.
 * ============================================================ */

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
