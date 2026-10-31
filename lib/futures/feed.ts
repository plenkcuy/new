import type { Candle } from "./indicators";

const BASE = "https://fapi.binance.com";

export const FUTURES_SYMBOLS = [
  { symbol: "BTCUSDT", label: "BTC" },
  { symbol: "ETHUSDT", label: "ETH" },
  { symbol: "SOLUSDT", label: "SOL" },
] as const;

async function getJson<T>(path: string, diag: string[]): Promise<T | null> {
  const name = path.split("?")[0];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(BASE + path, { cache: "no-store", signal: controller.signal });
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

export type RawDerivatives = {
  price: number | null;
  priceChange24h: number | null;
  funding: number | null;
  oiChange24h: number | null;
  ratio: number | null;
  longPct: number | null;
  shortPct: number | null;
};

const num = (v: unknown): number | null => {
  const n = typeof v === "string" || typeof v === "number" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

export async function fetchDerivatives(symbol: string, diag: string[]): Promise<RawDerivatives> {
  const [premium, ticker, oiHist, ls] = await Promise.all([
    getJson<{ lastFundingRate?: string; markPrice?: string }>(`/fapi/v1/premiumIndex?symbol=${symbol}`, diag),
    getJson<{ priceChangePercent?: string; lastPrice?: string }>(`/fapi/v1/ticker/24hr?symbol=${symbol}`, diag),
    getJson<Array<{ sumOpenInterestValue?: string }>>(`/futures/data/openInterestHist?symbol=${symbol}&period=1h&limit=25`, diag),
    getJson<Array<{ longShortRatio?: string; longAccount?: string; shortAccount?: string }>>(
      `/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`,
      diag,
    ),
  ]);

  let oiChange24h: number | null = null;
  if (Array.isArray(oiHist) && oiHist.length >= 2) {
    const first = num(oiHist[0].sumOpenInterestValue);
    const lastValue = num(oiHist[oiHist.length - 1].sumOpenInterestValue);
    if (first && lastValue !== null) oiChange24h = ((lastValue - first) / first) * 100;
  }

  const row = Array.isArray(ls) && ls.length ? ls[ls.length - 1] : null;
  const longPct = row ? num(row.longAccount) : null;
  const shortPct = row ? num(row.shortAccount) : null;

  return {
    price: num(ticker?.lastPrice) ?? num(premium?.markPrice),
    priceChange24h: num(ticker?.priceChangePercent),
    funding: num(premium?.lastFundingRate),
    oiChange24h,
    ratio: row ? num(row.longShortRatio) : null,
    longPct: longPct === null ? null : longPct * 100,
    shortPct: shortPct === null ? null : shortPct * 100,
  };
}

export async function fetchDailyCandles(symbol: string, diag: string[], limit = 150): Promise<Candle[] | null> {
  const rows = await getJson<Array<[number, string, string, string, string, string]>>(
    `/fapi/v1/klines?symbol=${symbol}&interval=1d&limit=${limit}`,
    diag,
  );
  if (!Array.isArray(rows) || rows.length < 40) return null;
  return rows.map((r) => ({ t: r[0], o: Number(r[1]), h: Number(r[2]), l: Number(r[3]), c: Number(r[4]), v: Number(r[5]) }));
}
