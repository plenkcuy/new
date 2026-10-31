export type Venue = "spot" | "futures";
export type Catalog = { spot: string[]; futures: string[] };
export type Suggestion = { symbol: string; base: string; venue: Venue; hasFutures: boolean };

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

export function venueOf(catalog: Catalog, symbol: string): Venue | null {
  if (catalog.spot.includes(symbol)) return "spot";
  if (catalog.futures.includes(symbol)) return "futures";
  return null;
}

export function searchCatalog(catalog: Catalog, raw: string, limit = 8): Suggestion[] {
  let q = normalizeQuery(raw);
  if (q.length > 4 && q.endsWith("USDT")) q = q.slice(0, -4);
  if (!q) return [];

  const spot = new Set(catalog.spot);
  const futures = new Set(catalog.futures);
  const rows: Array<{ rank: number; symbol: string; base: string }> = [];
  for (const symbol of new Set([...catalog.spot, ...catalog.futures])) {
    const base = baseOf(symbol);
    const rank = base === q ? 0 : base.startsWith(q) ? 1 : base.includes(q) ? 2 : -1;
    if (rank >= 0) rows.push({ rank, symbol, base });
  }
  rows.sort((a, b) => a.rank - b.rank || a.base.length - b.base.length || a.base.localeCompare(b.base));
  return rows.slice(0, limit).map((r) => ({
    symbol: r.symbol,
    base: r.base,
    venue: spot.has(r.symbol) ? "spot" : "futures",
    hasFutures: futures.has(r.symbol),
  }));
}

export function sanitizeWatch(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(isPair))].slice(0, MAX_WATCH);
}
