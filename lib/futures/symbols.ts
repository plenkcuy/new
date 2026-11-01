export type Venue = "spot" | "futures";
export type Catalog = { spot: string[]; futures: string[] };
export type Suggestion = { symbol: string; base: string; venue: Venue; hasFutures: boolean; multiplier: number };

export const MAX_WATCH = 6;
export const DEFAULT_WATCH = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

const PAIR_RE = /^[A-Z0-9]{1,15}USDT$/;
const QUERY_MAX = 20;
const CATALOG_MAX = 5000;

export const isPair = (value: unknown): value is string => typeof value === "string" && PAIR_RE.test(value);

export const baseOf = (symbol: string) => symbol.slice(0, -4);

export function normalizeQuery(raw: string): string {
  return raw.normalize("NFKC").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, QUERY_MAX);
}

export function cleanCatalog(spot: unknown[], futures: unknown[]): Catalog {
  const clean = (list: unknown[]) => [...new Set(list.filter(isPair))].sort().slice(0, CATALOG_MAX);
  return { spot: clean(spot), futures: clean(futures) };
}

export function isCatalog(value: unknown): value is Catalog {
  if (typeof value !== "object" || value === null) return false;
  const { spot, futures } = value as Partial<Catalog>;
  const ok = (list: unknown) => Array.isArray(list) && list.length <= CATALOG_MAX && list.every(isPair);
  return ok(spot) && ok(futures);
}

const MULTIPLIER_RE = /^(1000000|1000)(?=[A-Z])/;

/** Kontrak futures memecoin memakai awalan 1000 atau 1000000 (contoh 1000PEPEUSDT). */
export const stripMultiplier = (symbol: string) => symbol.replace(MULTIPLIER_RE, "");

export function multiplierOf(symbol: string): number {
  const m = symbol.match(MULTIPLIER_RE);
  return m ? Number(m[1]) : 1;
}

export type Coin = { primary: string; spot: string | null; futures: string | null; label: string; multiplier: number };

export function venueOf(catalog: Catalog, symbol: string): Venue | null {
  if (catalog.spot.includes(symbol)) return "spot";
  if (catalog.futures.includes(symbol)) return "futures";
  return null;
}

/** Mencocokkan satu koin ke simbol Spot dan Futures-nya, termasuk kontrak 1000x untuk memecoin. */
export function resolveCoin(catalog: Catalog, symbol: string): Coin | null {
  if (!isPair(symbol)) return null;
  const canon = stripMultiplier(symbol);
  const unique = (list: string[]) => [...new Set(list)];
  const spot = unique([symbol, canon]).find((s) => catalog.spot.includes(s)) ?? null;
  const futures =
    unique([symbol, canon, `1000${canon}`, `1000000${canon}`]).find((s) => catalog.futures.includes(s)) ?? null;
  const primary = spot ?? futures;
  if (!primary) return null;
  return { primary, spot, futures, label: baseOf(canon), multiplier: futures ? multiplierOf(futures) : 1 };
}

export function searchCatalog(catalog: Catalog, raw: string, limit = 8): Suggestion[] {
  let q = normalizeQuery(raw);
  if (q.length > 4 && q.endsWith("USDT")) q = q.slice(0, -4);
  q = q.replace(MULTIPLIER_RE, "");
  if (!q) return [];

  const rows: Array<{ rank: number; canon: string; base: string }> = [];
  for (const canon of new Set([...catalog.spot, ...catalog.futures].map(stripMultiplier))) {
    const base = baseOf(canon);
    const rank = base === q ? 0 : base.startsWith(q) ? 1 : base.includes(q) ? 2 : -1;
    if (rank >= 0) rows.push({ rank, canon, base });
  }
  rows.sort((a, b) => a.rank - b.rank || a.base.length - b.base.length || a.base.localeCompare(b.base));

  const out: Suggestion[] = [];
  for (const row of rows) {
    const coin = resolveCoin(catalog, row.canon);
    if (!coin) continue;
    out.push({
      symbol: coin.primary,
      base: coin.label,
      venue: coin.spot ? "spot" : "futures",
      hasFutures: Boolean(coin.futures),
      multiplier: coin.multiplier,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function sanitizeWatch(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(isPair))].slice(0, MAX_WATCH);
}
