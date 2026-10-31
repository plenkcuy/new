import { cached } from "./cache";
import type { Candle } from "./indicators";
import { cleanCatalog, isCatalog, isPair, type Catalog, type Venue } from "./symbols";

const HOSTS: Record<Venue, string> = {
  spot: "https://data-api.binance.vision",
  futures: "https://fapi.binance.com",
};

const TTL = { catalog: 6 * 60 * 60 * 1000, partialCatalog: 2 * 60 * 1000, live: 45_000, candles: 10 * 60 * 1000 };

const blockedUntil: Record<Venue, number> = { spot: 0, futures: 0 };

async function getJson<T>(venue: Venue, path: string, diag: string[]): Promise<T | null> {
  const name = path.split("?")[0];
  if (Date.now() < blockedUntil[venue]) {
    diag.push(`${name} ditahan sementara karena kena batas permintaan`);
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(HOSTS[venue] + path, {
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    if (res.status === 429 || res.status === 418) {
      const header = Number(res.headers.get("retry-after"));
      const seconds = Number.isFinite(header) && header > 0 ? header : res.status === 418 ? 300 : 60;
      blockedUntil[venue] = Date.now() + Math.min(seconds, 3600) * 1000;
    }
    if (!res.ok) {
      diag.push(`${name} dibalas ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    diag.push(`${name} gagal tersambung (${error instanceof Error ? error.name : "error"})`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" || typeof v === "number" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const nullableNumber = (v: unknown) => v === null || (typeof v === "number" && Number.isFinite(v));

async function cachedOrNull<T>(
  key: string,
  ttl: number,
  load: () => Promise<T | null>,
  validate: (v: unknown) => v is T,
): Promise<T | null> {
  try {
    return await cached(
      key,
      ttl,
      async () => {
        const value = await load();
        if (value === null) throw new Error("kosong");
        return value;
      },
      validate,
    );
  } catch {
    return null;
  }
}

export async function fetchCatalog(): Promise<Catalog | null> {
  try {
    return await cached(
      "catalog",
      (c) => (c.spot.length && c.futures.length ? TTL.catalog : TTL.partialCatalog),
      async () => {
        const diag: string[] = [];
        const [spot, futures] = await Promise.all([
          getJson<Array<{ symbol?: unknown }>>("spot", "/api/v3/ticker/price", diag),
          getJson<Array<{ symbol?: unknown }>>("futures", "/fapi/v1/ticker/price", diag),
        ]);
        if (!Array.isArray(spot) && !Array.isArray(futures)) throw new Error("katalog kosong");
        const names = (rows: unknown) => (Array.isArray(rows) ? rows.map((r) => (isObject(r) ? r.symbol : null)) : []);
        return cleanCatalog(names(spot), names(futures));
      },
      isCatalog,
    );
  } catch {
    return null;
  }
}

export type Market = { price: number | null; change24h: number | null };
export type Derivs = {
  funding: number | null;
  oiChange24h: number | null;
  ratio: number | null;
  longPct: number | null;
  shortPct: number | null;
};

export type RawDerivatives = {
  price: number | null;
  priceChange24h: number | null;
  funding: number | null;
  oiChange24h: number | null;
  ratio: number | null;
  longPct: number | null;
  shortPct: number | null;
};

const isMarket = (v: unknown): v is Market => isObject(v) && nullableNumber(v.price) && nullableNumber(v.change24h);
const isDerivs = (v: unknown): v is Derivs =>
  isObject(v) &&
  nullableNumber(v.funding) &&
  nullableNumber(v.oiChange24h) &&
  nullableNumber(v.ratio) &&
  nullableNumber(v.longPct) &&
  nullableNumber(v.shortPct);
const isCandles = (v: unknown): v is Candle[] =>
  Array.isArray(v) &&
  v.length <= 500 &&
  v.every((c) => isObject(c) && [c.t, c.o, c.h, c.l, c.c, c.v].every((n) => typeof n === "number" && Number.isFinite(n)));

export function fetchMarket(symbol: string, venue: Venue, diag: string[]): Promise<Market | null> {
  if (!isPair(symbol)) return Promise.resolve(null);
  const path = venue === "spot" ? `/api/v3/ticker/24hr?symbol=${symbol}` : `/fapi/v1/ticker/24hr?symbol=${symbol}`;
  return cachedOrNull(`mk:${venue}:${symbol}`, TTL.live, async () => {
    const row = await getJson<{ lastPrice?: unknown; priceChangePercent?: unknown }>(venue, path, diag);
    if (!row) return null;
    const price = num(row.lastPrice);
    const change24h = num(row.priceChangePercent);
    return price === null || change24h === null ? null : { price, change24h };
  }, isMarket);
}

export function fetchDerivs(symbol: string, diag: string[]): Promise<Derivs | null> {
  if (!isPair(symbol)) return Promise.resolve(null);
  return cachedOrNull(`dv:${symbol}`, TTL.live, async () => {
    const [premium, oiHist, ls] = await Promise.all([
      getJson<{ lastFundingRate?: unknown }>("futures", `/fapi/v1/premiumIndex?symbol=${symbol}`, diag),
      getJson<Array<{ sumOpenInterestValue?: unknown }>>("futures", `/futures/data/openInterestHist?symbol=${symbol}&period=1h&limit=25`, diag),
      getJson<Array<{ longShortRatio?: unknown; longAccount?: unknown; shortAccount?: unknown }>>(
        "futures",
        `/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`,
        diag,
      ),
    ]);

    let oiChange24h: number | null = null;
    if (Array.isArray(oiHist) && oiHist.length >= 2) {
      const first = num(oiHist[0]?.sumOpenInterestValue);
      const last = num(oiHist[oiHist.length - 1]?.sumOpenInterestValue);
      if (first && last !== null) oiChange24h = ((last - first) / first) * 100;
    }
    const row = Array.isArray(ls) && ls.length ? ls[ls.length - 1] : null;
    const longPct = row ? num(row.longAccount) : null;
    const shortPct = row ? num(row.shortAccount) : null;
    const result: Derivs = {
      funding: num(premium?.lastFundingRate),
      oiChange24h,
      ratio: row ? num(row.longShortRatio) : null,
      longPct: longPct === null ? null : longPct * 100,
      shortPct: shortPct === null ? null : shortPct * 100,
    };
    return Object.values(result).every((v) => v === null) ? null : result;
  }, isDerivs);
}

export function fetchCandles(symbol: string, venue: Venue, diag: string[], limit = 150): Promise<Candle[] | null> {
  if (!isPair(symbol)) return Promise.resolve(null);
  const path =
    venue === "spot"
      ? `/api/v3/klines?symbol=${symbol}&interval=1d&limit=${limit}`
      : `/fapi/v1/klines?symbol=${symbol}&interval=1d&limit=${limit}`;
  return cachedOrNull(`cd:${venue}:${symbol}`, TTL.candles, async () => {
    const rows = await getJson<unknown[]>(venue, path, diag);
    if (!Array.isArray(rows) || rows.length < 40) return null;
    const candles: Candle[] = [];
    for (const r of rows) {
      if (!Array.isArray(r)) return null;
      const [t, o, h, l, c, v] = [num(r[0]), num(r[1]), num(r[2]), num(r[3]), num(r[4]), num(r[5])];
      if (t === null || o === null || h === null || l === null || c === null || v === null) return null;
      candles.push({ t, o, h, l, c, v });
    }
    return candles;
  }, isCandles);
}
