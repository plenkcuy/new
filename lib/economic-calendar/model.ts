import "server-only";

/**
 * Model dan klasifikasi kalender ekonomi AS.
 * Dipakai oleh scraper halaman kalender Trading Economics (scrape.ts).
 *
 * Dampak kripto dibaca dari selisih Actual dan Consensus. Ini heuristik yang umum dipakai pasar,
 * bukan prediksi. Data baru bisa berbeda dari perkiraan, dan reaksi pasar tidak selalu searah.
 */

export type Importance = "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type ImpactLevel = "critical" | "high" | "medium" | "low" | "info";
export type Polarity = "higher_is_bearish" | "higher_is_bullish" | "netral";
export type Source = "scrape";

export type CryptoImpact = {
  level: ImpactLevel;
  assets: string[];
  /** Arah yang dibaca dari selisih Actual dan Consensus. */
  direction: string;
  reason: string;
};

export type EconEvent = {
  id: string;
  name: string;
  category: string;
  importance: Importance;
  /** Waktu rilis dalam WIB. Null kalau rilisnya tidak punya jam tetap (misalnya tracker). */
  wibIso: string | null;
  wibDate: string | null;
  wibTime: string | null;
  actual: string;
  previous: string;
  consensus: string;
  stockAssets: string[];
  crypto: CryptoImpact;
  detailUrl: string | null;
  source: Source;
};

/* ---------- Dampak saham (dari scraper lama) ---------- */

const CRITICAL_KEYWORDS = [
  "non farm payrolls", "nonfarm payrolls", "inflation rate yoy", "inflation rate mom", "core inflation",
  "cpi", "core cpi", "pce price index", "core pce", "interest rate decision", "fed interest rate",
  "fomc", "gdp growth", "unemployment rate", "retail sales mom", "producer price", "ppi",
  "ism manufacturing pmi", "ism services pmi",
];

const STOCK_MAP: { keys: string[]; assets: string[] }[] = [
  { keys: ["interest rate", "fomc", "fed funds"], assets: ["USD", "Obligasi US", "Emas", "Saham AS"] },
  { keys: ["inflation rate", "core inflation", "cpi", "pce"], assets: ["USD", "Obligasi US", "Emas", "Saham AS"] },
  { keys: ["producer price", "ppi"], assets: ["USD", "Obligasi US", "Saham AS"] },
  { keys: ["non farm payrolls", "nonfarm payrolls", "nfp"], assets: ["USD", "Saham AS", "Emas"] },
  { keys: ["unemployment rate"], assets: ["USD", "Saham AS"] },
  { keys: ["adp employment"], assets: ["USD", "Saham AS"] },
  { keys: ["jobless claims"], assets: ["USD"] },
  { keys: ["gdp"], assets: ["USD", "Saham AS"] },
  { keys: ["retail sales"], assets: ["USD", "Saham AS"] },
  { keys: ["consumer confidence", "michigan"], assets: ["USD", "Saham AS"] },
  { keys: ["ism manufacturing", "ism services"], assets: ["USD", "Saham AS"] },
  { keys: ["durable goods"], assets: ["USD", "Saham AS"] },
  { keys: ["trade balance", "current account"], assets: ["USD"] },
  { keys: ["crude oil stocks", "crude oil production"], assets: ["Minyak (WTI/Brent)", "Saham energi"] },
  { keys: ["natural gas stocks"], assets: ["Gas alam"] },
  { keys: ["housing", "mortgage", "home sales", "building permits"], assets: ["USD", "Saham properti"] },
  { keys: ["fed speech", "fed chair", "powell"], assets: ["USD", "Obligasi US", "Saham AS"] },
];

/* ---------- Dampak kripto ---------- */

type CryptoRule = { keys: string[]; level: ImpactLevel; polarity: Polarity; why: string };

/**
 * Urutan penting: aturan pertama yang cocok yang dipakai.
 * Logika: suku bunga dan inflasi tinggi biasanya menekan aset berisiko seperti kripto.
 * Pasar yang kuat dan minim pemotongan suku bunga juga biasanya menekan kripto.
 * Pengangguran naik membuka peluang pelonggaran, dan itu biasanya positif untuk kripto.
 */
const CRYPTO_RULES: CryptoRule[] = [
  { keys: ["interest rate", "fomc", "fed funds", "rate decision"], level: "critical", polarity: "higher_is_bearish", why: "Suku bunga lebih tinggi dari perkiraan mengurangi minat ke aset berisiko." },
  { keys: ["inflation rate", "core inflation", "cpi", "pce"], level: "critical", polarity: "higher_is_bearish", why: "Inflasi lebih tinggi dari perkiraan membuat pemotongan suku bunga makin jauh." },
  { keys: ["non farm payrolls", "nonfarm payrolls", "nfp"], level: "high", polarity: "higher_is_bearish", why: "Data tenaga kerja yang terlalu kuat mengurangi peluang pelonggaran moneter." },
  { keys: ["unemployment rate"], level: "high", polarity: "higher_is_bullish", why: "Pengangguran lebih tinggi dari perkiraan membuka peluang pelonggaran moneter." },
  { keys: ["producer price", "ppi"], level: "high", polarity: "higher_is_bearish", why: "Inflasi di tingkat produsen yang naik memberi sinyal tekanan harga." },
  { keys: ["fed speech", "fed chair", "powell"], level: "high", polarity: "netral", why: "Nada pernyataan The Fed sulit diukur dari angka, jadi arahnya dibaca dari konteks berita." },
  { keys: ["gdp"], level: "medium", polarity: "netral", why: "Pertumbuhan ekonomi memengaruhi selera risiko, tetapi dampaknya tidak selalu langsung." },
  { keys: ["retail sales", "ism", "durable goods", "consumer confidence", "michigan"], level: "medium", polarity: "higher_is_bearish", why: "Ekonomi yang terlalu panas bisa menunda pelonggaran moneter." },
  { keys: ["jobless claims"], level: "low", polarity: "higher_is_bullish", why: "Klaim pengangguran yang naik bisa membuka peluang pelonggaran." },
  { keys: ["trade balance", "current account", "housing", "mortgage"], level: "low", polarity: "netral", why: "Dampak tidak langsung ke kripto." },
];

const DIRECTION_LABEL = {
  bearish: "Cenderung negatif untuk kripto",
  bullish: "Cenderung positif untuk kripto",
  netral: "Netral untuk kripto",
  pending: "Menunggu rilis",
  inline: "Sesuai perkiraan, dampak terbatas",
} as const;

/* ---------- Helper ---------- */

const hay = (name: string, category: string) => `${category} ${name}`.toLowerCase();

/** Kata kunci dicocokkan sebagai kata utuh, supaya "fed" tidak cocok ke "GDPNow". */
const hasKey = (h: string, key: string): boolean => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(h);
};

export function isCriticalName(name: string): boolean {
  const s = name.toLowerCase();
  return CRITICAL_KEYWORDS.some((k) => hasKey(s, k));
}

export function stockAssetsFor(name: string, category: string): string[] {
  const h = hay(name, category);
  const set = new Set<string>();
  for (const { keys, assets } of STOCK_MAP) if (keys.some((k) => hasKey(h, k))) assets.forEach((a) => set.add(a));
  return [...set];
}

/** Angka dari teks seperti "3.2%", "250K", atau "1,234". Null kalau tidak ada angka. */
export function parseNumber(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim();
  const m = cleaned.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** Arah dampak dibaca dari selisih Actual dan Consensus. Tanpa keduanya, arah belum bisa ditentukan. */
export function directionFor(polarity: Polarity, actual: string, consensus: string): string {
  const a = parseNumber(actual);
  const c = parseNumber(consensus);
  if (a === null) return DIRECTION_LABEL.pending;
  if (c === null) return DIRECTION_LABEL.pending;
  if (polarity === "netral") return DIRECTION_LABEL.netral;
  if (a === c) return DIRECTION_LABEL.inline;
  const higher = a > c;
  const bearish = polarity === "higher_is_bearish" ? higher : !higher;
  return bearish ? DIRECTION_LABEL.bearish : DIRECTION_LABEL.bullish;
}

export function cryptoImpactFor(name: string, category: string, actual: string, consensus: string): CryptoImpact {
  const h = hay(name, category);
  const rule = CRYPTO_RULES.find((r) => r.keys.some((k) => hasKey(h, k)));
  if (!rule) {
    return { level: "info", assets: [], direction: "Tidak ada dampak langsung ke kripto", reason: "Rilis ini tidak masuk kategori yang biasanya menggerakkan kripto." };
  }
  const assets = rule.level === "low" ? ["BTC"] : ["BTC", "ETH", "Altcoin"];
  return { level: rule.level, assets, direction: directionFor(rule.polarity, actual, consensus), reason: rule.why };
}

/** Bentuk mentah dari sumber mana pun. Adapter hanya bertugas mengubah datanya ke bentuk ini. */
export type RawEvent = {
  name: string;
  category: string;
  stars: number;
  actual: string;
  previous: string;
  consensus: string;
  wibIso: string | null;
  wibDate: string | null;
  wibTime: string | null;
  detailUrl: string | null;
  source: Source;
};

export function importanceOf(stars: number): Importance {
  return stars >= 3 ? "HIGH" : stars === 2 ? "MEDIUM" : stars === 1 ? "LOW" : "INFO";
}

export function toEvent(raw: RawEvent): EconEvent {
  return {
    id: `${raw.source}:${raw.wibIso ?? "none"}:${raw.name}`.slice(0, 160),
    name: raw.name,
    category: raw.category,
    importance: importanceOf(raw.stars),
    wibIso: raw.wibIso,
    wibDate: raw.wibDate,
    wibTime: raw.wibTime,
    actual: raw.actual,
    previous: raw.previous,
    consensus: raw.consensus,
    stockAssets: stockAssetsFor(raw.name, raw.category),
    crypto: cryptoImpactFor(raw.name, raw.category, raw.actual, raw.consensus),
    detailUrl: raw.detailUrl,
    source: raw.source,
  };
}

/** Konversi waktu UTC ke WIB (UTC+7). Pakai Intl supaya tidak bergantung pada zona waktu server. */
export function toWib(utcMs: number): { iso: string; date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const time = `${get("hour")}:${get("minute")}`;
  return { iso: `${date}T${time}:00+07:00`, date, time };
}
