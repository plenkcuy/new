import {
  computeTech,
  conviction,
  decide,
  scoreDerivatives,
  voteMomentum,
  voteTren,
  voteVolume,
  type Bias,
  type DerivativeResult,
  type Groups,
  type TechInput,
} from "./engine";
import { invalidate } from "./cache";
import { fetchCandles, fetchCatalog, fetchDerivs, fetchMarket, type Derivs, type Market, type RawDerivatives } from "./feed";
import { MAX_WATCH, baseOf, isPair, resolveCoin, stripMultiplier, type Catalog, type Coin, type Venue } from "./symbols";

export type { RawDerivatives } from "./feed";

export type FuturesCard = {
  /** Kunci koin di daftar pantauan (simbol Spot bila ada, selain itu simbol Futures). */
  symbol: string;
  label: string;
  venue: Venue;
  spotSymbol: string | null;
  futuresSymbol: string | null;
  /** Kelipatan kontrak futures (1000 untuk memecoin seperti 1000PEPEUSDT). */
  multiplier: number;
  hasFutures: boolean;
  ok: boolean;
  metrics: RawDerivatives;
  derivatives: DerivativeResult | null;
  technical: { input: TechInput; groups: Groups } | null;
  bias: Bias;
  conviction: number;
  reason: string;
  error?: string;
};

export type FuturesSnapshot = { cards: FuturesCard[]; updatedAt: number };

const EMPTY: RawDerivatives = { price: null, priceChange24h: null, funding: null, oiChange24h: null, ratio: null, longPct: null, shortPct: null };

function failed(symbol: string, reason: string, error?: string): FuturesCard {
  return {
    symbol,
    label: baseOf(stripMultiplier(symbol)),
    venue: "spot",
    spotSymbol: null,
    futuresSymbol: null,
    multiplier: 1,
    hasFutures: false,
    ok: false,
    metrics: EMPTY,
    derivatives: null,
    technical: null,
    bias: "NETRAL",
    conviction: 0,
    reason,
    error,
  };
}

async function buildCard(symbol: string, catalog: Catalog | null): Promise<FuturesCard> {
  const diag: string[] = [];

  let coin: Coin | null;
  if (catalog) {
    coin = resolveCoin(catalog, symbol);
    if (!coin) return failed(symbol, "Koin tidak ditemukan di Binance Spot maupun Futures.");
  } else {
    coin = { primary: symbol, spot: symbol, futures: symbol, label: baseOf(stripMultiplier(symbol)), multiplier: 1 };
  }

  const order: Venue[] = coin.spot ? (coin.futures ? ["spot", "futures"] : ["spot"]) : ["futures"];
  const symbolFor = (v: Venue) => (v === "spot" ? coin.spot : coin.futures) as string;

  let venue: Venue = order[0];
  let market: Market | null = null;
  for (const v of order) {
    market = await fetchMarket(symbolFor(v), v, diag);
    if (market) {
      venue = v;
      break;
    }
  }

  const [derivs, candlesFirst] = await Promise.all([
    coin.futures ? fetchDerivs(coin.futures, diag) : Promise.resolve<Derivs | null>(null),
    market ? fetchCandles(symbolFor(venue), venue, diag) : Promise.resolve(null),
  ]);
  let candles = candlesFirst;
  if (market && !candles && venue === "spot" && coin.futures) candles = await fetchCandles(coin.futures, "futures", diag);

  const hasFutures = coin.futures !== null && (catalog !== null || derivs !== null);
  const error = diag.length ? [...new Set(diag)].slice(0, 2).join(", ") : undefined;
  const change = market?.change24h ?? null;

  const metrics: RawDerivatives = {
    price: market?.price ?? null,
    priceChange24h: change,
    funding: derivs?.funding ?? null,
    oiChange24h: derivs?.oiChange24h ?? null,
    ratio: derivs?.ratio ?? null,
    longPct: derivs?.longPct ?? null,
    shortPct: derivs?.shortPct ?? null,
  };

  const derivatives =
    derivs && change !== null
      ? scoreDerivatives({ priceChange24h: change, oiChange24h: derivs.oiChange24h, funding: derivs.funding, ratio: derivs.ratio })
      : null;

  const input = candles ? computeTech(candles) : null;
  const technical = input
    ? {
        input,
        groups: {
          tren: voteTren(input),
          momentum: voteMomentum(input),
          volume: voteVolume(input, derivatives?.bias ?? null),
        } satisfies Groups,
      }
    : null;

  const base = {
    symbol: coin.primary,
    label: coin.label,
    venue,
    spotSymbol: coin.spot,
    futuresSymbol: hasFutures ? coin.futures : null,
    multiplier: coin.multiplier,
    hasFutures,
    ok: true,
    metrics,
    derivatives,
    technical,
    error,
  };

  if (technical) {
    const { bias, reason } = decide(technical.groups);
    const note = derivatives ? "" : " Koin ini tidak punya data derivatif, jadi keputusan hanya dari teknikal harian.";
    return { ...base, bias, conviction: conviction(bias, technical.groups, derivatives?.total ?? null), reason: reason + note };
  }
  if (derivatives) {
    return {
      ...base,
      bias: derivatives.bias,
      conviction: conviction(derivatives.bias, null, derivatives.total),
      reason: "Data teknikal harian belum tersedia, keputusan hanya dari screening derivatif.",
    };
  }
  return { ...base, ok: false, bias: "NETRAL", conviction: 0, reason: "Data belum bisa diambil, coba lagi sebentar lagi." };
}

export async function getFuturesSentiment(symbols: string[], options: { fresh?: boolean } = {}): Promise<FuturesSnapshot> {
  if (options.fresh) invalidate(["mk:", "dv:", "cd:"]);
  const list = [...new Set(symbols.filter(isPair))].slice(0, MAX_WATCH);
  const catalog = await fetchCatalog();
  const cards = await Promise.all(list.map((s) => buildCard(s, catalog)));
  return { cards, updatedAt: Date.now() };
}
