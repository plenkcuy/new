import "server-only";
import { dexScreenerQuote, getJson, latestUsdIdrFallback } from "./market-feed";
import { scrapePluangPrice } from "./scrapers/pluang";
import { scrapeRekuPrice } from "./scrapers/reku";
import type { AssetClass } from "./shared";

/**
 * Harga terkini per jenis aset:
 *   saham IDX  : Pluang (scraper)
 *   saham US   : Reku (scraper)
 *   crypto     : Binance spot REST (di browser Premium ditimpa WebSocket)
 *   meme coin  : DexScreener
 * Hasil di cache di memori instance supaya banyak pengguna tidak membuat banyak request ke sumber.
 */

export type Quote = {
  price: number;
  changePct: number | null;
  source: "pluang" | "reku" | "binance" | "dexscreener";
  t: number;
};

export type QuoteTarget = {
  assetId: number;
  assetClass: AssetClass;
  symbol: string;
  chain: string | null;
  priceRef: string;
};

const STALE_FALLBACK_MS = 30 * 60 * 1000;
const CONCURRENCY = 4;

const cache = new Map<string, Quote>();
const inflight = new Map<string, Promise<Quote | null>>();

const keyOf = (t: QuoteTarget) => `${t.assetClass}:${t.chain ?? ""}:${t.assetClass === "meme" ? t.priceRef : t.symbol}`;

type BinanceTicker = { lastPrice?: string; priceChangePercent?: string };

async function binanceQuote(symbol: string): Promise<Quote | null> {
  if (!/^[A-Z0-9]{2,12}$/.test(symbol)) return null;
  for (const host of ["https://data-api.binance.vision", "https://api.binance.com"]) {
    const data = (await getJson(`${host}/api/v3/ticker/24hr?symbol=${symbol}USDT`)) as BinanceTicker | null;
    const price = Number(data?.lastPrice);
    if (price > 0) {
      const change = Number(data?.priceChangePercent);
      return { price, changePct: Number.isFinite(change) ? change : null, source: "binance", t: Date.now() };
    }
  }
  return null;
}

async function load(target: QuoteTarget): Promise<Quote | null> {
  const now = Date.now();
  switch (target.assetClass) {
    case "idx": {
      const q = await scrapePluangPrice(target.symbol);
      return q && { ...q, source: "pluang", t: now };
    }
    case "us_stock": {
      const q = await scrapeRekuPrice(target.symbol);
      return q && { ...q, source: "reku", t: now };
    }
    case "crypto":
      return binanceQuote(target.symbol);
    case "meme": {
      if (!target.chain) return null;
      const q = await dexScreenerQuote(target.chain, target.priceRef);
      return q && { ...q, source: "dexscreener", t: now };
    }
  }
}

function resolve(target: QuoteTarget, maxAgeMs: number): Promise<Quote | null> {
  const key = keyOf(target);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.t < maxAgeMs) return Promise.resolve(cached);

  const pending = inflight.get(key);
  if (pending) return pending;

  const job = load(target)
    .then((fresh) => {
      if (fresh) cache.set(key, fresh);
      // Bila sumber gagal sebentar, pakai harga terakhir selama masih wajar.
      return fresh ?? (cached && Date.now() - cached.t < STALE_FALLBACK_MS ? cached : null);
    })
    .catch(() => (cached && Date.now() - cached.t < STALE_FALLBACK_MS ? cached : null))
    .finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

/** Harga terkini per assetId. Aset yang gagal diambil tidak ada di hasil. */
export async function fetchQuotes(targets: QuoteTarget[], maxAgeMs: number): Promise<Map<number, Quote>> {
  const result = new Map<number, Quote>();
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const quotes = await Promise.all(batch.map((t) => resolve(t, maxAgeMs)));
    batch.forEach((t, j) => {
      const q = quotes[j];
      if (q) result.set(t.assetId, q);
    });
  }
  return result;
}

/* ---------- Kurs USD ke IDR ---------- */

let fxCache: { rate: number; t: number } | null = null;

type YahooMeta = { chart?: { result?: { meta?: { regularMarketPrice?: number } }[] } };

export async function fetchUsdIdrLive(maxAgeMs: number): Promise<number | null> {
  if (fxCache && Date.now() - fxCache.t < maxAgeMs) return fxCache.rate;

  const data = (await getJson(
    "https://query1.finance.yahoo.com/v8/finance/chart/USDIDR=X?range=1d&interval=1d",
  )) as YahooMeta | null;
  const quoted = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  const rate = typeof quoted === "number" && quoted > 1000 ? quoted : await latestUsdIdrFallback();

  if (rate) fxCache = { rate, t: Date.now() };
  return rate ?? (fxCache && Date.now() - fxCache.t < STALE_FALLBACK_MS ? fxCache.rate : null);
}
