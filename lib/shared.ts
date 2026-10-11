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

export type Point = { t: number; value: number; pnl?: number };

export type WatchItem = {
  symbol: string;
  name: string;
  market: Market;
  ccy: Ccy;
  price: number;
  /** Perubahan harga (%). */
  change: number;
  icon: string | null;
  capLabel: string | null;
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

/* ============================================================
 * Jurnal transaksi (saham IDX, saham US, crypto, meme coin)
 * ============================================================ */

export const ASSET_CLASSES = ["idx", "us_stock", "crypto", "meme"] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export function isAssetClass(value: unknown): value is AssetClass {
  return typeof value === "string" && (ASSET_CLASSES as readonly string[]).includes(value);
}

export const CLASS_LABEL: Record<AssetClass, string> = {
  idx: "Saham IDX",
  us_stock: "Saham US",
  crypto: "Crypto",
  meme: "Meme coin",
};

export const CLASS_COLOR: Record<AssetClass, string> = {
  idx: "#2dd4bf",
  us_stock: "#5b8def",
  crypto: "#fbbf24",
  meme: "#f472b6",
};

export type Ccy = "IDR" | "USD";

export const CHAINS = ["solana", "ethereum", "base", "bsc"] as const;
export type Chain = (typeof CHAINS)[number];

export const CHAIN_LABEL: Record<Chain, string> = {
  solana: "Solana",
  ethereum: "Ethereum",
  base: "Base",
  bsc: "BNB Chain",
};

export const EMOTIONS = ["tenang", "yakin", "ragu", "takut", "fomo", "serakah"] as const;

/** 1 lot saham IDX = 100 lembar. */
export const IDX_LOT = 100;

export const JOURNAL_METRICS = ["value", "pnl", "twr", "dd"] as const;
export type JournalMetric = (typeof JOURNAL_METRICS)[number];

export const METRIC_LABEL: Record<JournalMetric, string> = {
  value: "Nilai",
  pnl: "Untung rugi",
  twr: "Kinerja",
  dd: "Drawdown",
};

/** Satu titik kurva ekuitas harian. Metrik premium dihilangkan server untuk Free. */
export type EquityPoint = {
  t: number;
  value: number;
  pnl: number;
  twr?: number;
  dd?: number;
};

export type JournalFormState = {
  ok: boolean;
  message?: string;
  values?: Record<string, string>;
};

/* ---------- Format jurnal ---------- */

export const money = (n: number, ccy: Ccy) =>
  ccy === "IDR"
    ? idr(n)
    : new Intl.NumberFormat("id-ID", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

/** Harga satuan. Meme coin bisa sangat kecil, jadi pakai digit signifikan. */
export function unitPrice(n: number, ccy: Ccy): string {
  const prefix = ccy === "IDR" ? "Rp " : "$ ";
  if (ccy === "IDR") return prefix + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);
  if (n >= 1) return prefix + new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n);
  return prefix + new Intl.NumberFormat("id-ID", { maximumSignificantDigits: 6 }).format(n);
}

export const quantity = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 8 }).format(n);

/** Waktu ditampilkan dalam WIB agar sama di server dan client. */
export const formatDateTime = (ms: number) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(ms);

/* ---------- Portofolio live ---------- */

/** Posisi terbuka yang dikirim ke client untuk dihitung ulang saat harga bergerak. */
export type LivePosition = {
  assetId: number;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  ccy: Ccy;
  qty: number;
  /** Harga rata rata dalam mata uang aset. */
  avgPrice: number;
  /** Total modal dalam mata uang laporan. */
  costReport: number;
  price: number;
  /** Nilai posisi dalam mata uang laporan. */
  value: number;
  unrealizedPct: number;
  changePct: number | null;
  priceFromTrade: boolean;
  source: string | null;
  /** Nama stream Binance (huruf kecil) untuk crypto, mis. btcusdt. */
  stream: string | null;
  icon: string | null;
};

export type LiveQuote = { price: number; changePct: number | null; source: string };

/* ---------- Ikon aset ---------- */

const PLUANG_ICONS = "https://image-cdn.pluang.com/indo-stock/light/asset-icons";

/** Hanya URL https yang rapi yang boleh dipakai sebagai ikon. */
export function safeIconUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 300 || /[\s"'<>]/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Ikon tersimpan bila ada. Saham IDX punya pola URL tetap di CDN Pluang, jadi selalu bisa ditebak. */
export function assetIconUrl(assetClass: AssetClass, symbol: string, stored: string | null | undefined): string | null {
  const safe = safeIconUrl(stored);
  if (safe) return safe;
  if (assetClass === "idx" && /^[A-Z0-9]{2,6}$/.test(symbol)) return `${PLUANG_ICONS}/${symbol.toLowerCase()}.svg`;
  return null;
}

/* ---------- Kalender PnL ---------- */

export type CalendarTrade = {
  symbol: string;
  assetClass: AssetClass;
  qty: number;
  pnl: number;
  pnlPct: number;
  r: number | null;
};

/** Rekap satu hari (tanggal WIB). pnl = untung rugi terealisasi dari transaksi jual hari itu. */
export type CalendarDay = {
  pnl: number;
  wins: number;
  losses: number;
  buys: number;
  trades: CalendarTrade[];
};

/** Singkatan angka untuk sel kalender: rb, jt, M untuk IDR dan k, m, b untuk USD. */
export function compactMoney(n: number, ccy: Ccy): string {
  if (n === 0) return "0";
  const abs = Math.abs(n);
  const units: [number, string][] =
    ccy === "IDR"
      ? [[1e9, "M"], [1e6, "jt"], [1e3, "rb"]]
      : [[1e9, "b"], [1e6, "m"], [1e3, "k"]];

  let body = "";
  for (const [size, suffix] of units) {
    if (abs >= size) {
      body = (abs / size).toFixed(1).replace(/\.0$/, "").replace(".", ",") + suffix;
      break;
    }
  }
  if (!body) body = (abs >= 100 || ccy === "IDR" ? String(Math.round(abs)) : abs.toFixed(1).replace(/\.0$/, "")).replace(".", ",");

  // Tanda minus tipografis, bukan tanda hubung.
  return (n > 0 ? "+" : "\u2212") + body;
}

/* ============================================================
 * Daftar pasar (watchlist, trending, ringkasan pasar)
 * ============================================================ */

export const MARKETS = ["idx", "us", "crypto"] as const;
export type Market = (typeof MARKETS)[number];

export function isMarket(value: unknown): value is Market {
  return typeof value === "string" && (MARKETS as readonly string[]).includes(value);
}

export const MARKET_LABEL: Record<Market, string> = { idx: "Saham IDX", us: "Saham US", crypto: "Crypto" };

/** Warna dan mata uang per pasar, dipakai ikon dan format harga. */
export const MARKET_COLOR: Record<Market, string> = { idx: "#2dd4bf", us: "#5b8def", crypto: "#fbbf24" };
export const MARKET_CCY: Record<Market, Ccy> = { idx: "IDR", us: "USD", crypto: "USD" };

export type ListDef = {
  key: string;
  label: string;
  /** Daftar sumber di database. Daftar turunan (Naik, Turun) memakai sumber yang sama. */
  from: string;
  derive?: "gainers" | "losers";
  /** Nama subkategori di situs sumber (untuk scraper Pluang). */
  sub?: string;
};

export const LIST_DEFS: Record<Market, ListDef[]> = {
  idx: [
    { key: "gainers", label: "Naik", from: "gainers", sub: "Gainers" },
    { key: "losers", label: "Turun", from: "losers", sub: "Losers" },
    { key: "mcap", label: "Terbesar", from: "mcap", sub: "Market Cap" },
  ],
  us: [
    { key: "gainers", label: "Naik", from: "gainers", sub: "Gainers" },
    { key: "losers", label: "Turun", from: "losers", sub: "Losers" },
    { key: "mag7", label: "Magnificent 7", from: "mag7", sub: "Magnificent 7" },
  ],
  crypto: [
    { key: "viewed", label: "Terpopuler", from: "viewed" },
    { key: "gainers", label: "Naik", from: "viewed", derive: "gainers" },
    { key: "losers", label: "Turun", from: "viewed", derive: "losers" },
  ],
};

export type MarketItem = {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  changePct: number | null;
  ccy: Ccy;
  icon: string | null;
  capLabel: string | null;
  change7d: number | null;
};

export type WatchList = { key: string; label: string; items: WatchItem[]; locked: number };
export type WatchMarket = { market: Market; lists: WatchList[]; updatedAt: number | null };

export type OverviewItem = { name: string; value: string; changePct: number | null; group: string | null };

/** Angka besar dalam satuan Indonesia: T (triliun), M (miliar), jt (juta). */
export function compactUsd(n: number): string {
  const abs = Math.abs(n);
  const units: [number, string][] = [[1e12, "T"], [1e9, "M"], [1e6, "jt"]];
  for (const [size, suffix] of units) {
    if (abs >= size) return `$ ${(n / size).toFixed(2).replace(".", ",")} ${suffix}`;
  }
  return `$ ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)}`;
}

/** Sumbu grafik untuk nilai rupiah atau dolar: rb, jt, M atau k, m, b. */
export function axisMoney(v: number, ccy: Ccy): string {
  const abs = Math.abs(v);
  if (ccy === "IDR") {
    if (abs >= 1e9) return `${(v / 1e9).toFixed(1).replace(".", ",")} M`;
    if (abs >= 1e6) return `${Math.round(v / 1e6)} jt`;
    if (abs >= 1e3) return `${Math.round(v / 1e3)} rb`;
    return String(Math.round(v));
  }
  return `$${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v)}`;
}
