/**
 * Tipe domain + fungsi format. Tanpa kode server, aman diimpor dari server,
 * client component, maupun Edge.
 */

/* ============================================================
 * Tipe
 * ============================================================ */

export type Tier = "free" | "premium" | "admin";
export type UserStatus = "active" | "suspended";

export type User = {
  id: string;
  name: string;
  email: string;
  tier: Tier;
  status: UserStatus;
  /** Tanggal ISO (YYYY-MM-DD). */
  createdAt: string;
  lastActiveAt: string;
};

/** Data pengguna yang aman dibagikan ke UI. */
export type SessionUser = Pick<User, "id" | "name" | "email" | "tier">;

/** Isi cookie sesi yang ditandatangani. `exp` dalam detik Unix. */
export type SessionPayload = { sub: string; tier: Tier; exp: number };

/** Parameter URL (?a=b) yang sudah dinormalkan jadi satu nilai per kunci. */
export type Query = Record<string, string | undefined>;

/** Props yang diterima setiap layar tab (lihat app/[tab]/page.tsx). */
export type ScreenProps = { user: SessionUser; query: Query };

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

export type Post = {
  id: string;
  author: string;
  role: "Analis" | "Investor";
  time: string;
  body: string;
  likes: number;
  replies: number;
  tags: string[];
};

/* ============================================================
 * Format
 * ============================================================ */

export const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export const compactIdr = (n: number) =>
  "Rp " + new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const num = (n: number) => new Intl.NumberFormat("id-ID").format(n);

export const decimal = (n: number, digits = 2) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

export const pct = (n: number, digits = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(digits).replace(".", ",")}%`;

/** "2026-10-07" → "7 Okt 2026" (UTC agar sama di server dan client). */
export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );
