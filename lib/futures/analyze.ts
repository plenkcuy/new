import {
  computeTech,
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
import { fetchCandles, fetchCatalog, fetchDerivs, fetchMarket, type Derivs, type Market, type RawDerivatives } from "./feed";
import { MAX_WATCH, baseOf, isPair, venueOf, type Catalog, type Venue } from "./symbols";

export type { RawDerivatives } from "./feed";

export type FuturesCard = {
  symbol: string;
  label: string;
  venue: Venue;
  hasFutures: boolean;
  ok: boolean;
  metrics: RawDerivatives;
  derivatives: DerivativeResult | null;
  technical: { input: TechInput; groups: Groups } | null;
  bias: Bias;
  reason: string;
  error?: string;
};

export type FuturesSnapshot = { cards: FuturesCard[]; updatedAt: number };

const EMPTY: RawDerivatives = { price: null, priceChange24h: null, funding: null, oiChange24h: null, ratio: null, longPct: null, shortPct: null };

function failed(symbol: string, venue: Venue, reason: string, error?: string): FuturesCard {
  return { symbol, label: baseOf(symbol), venue, hasFutures: false, ok: false, metrics: EMPTY, derivatives: null, technical: null, bias: "NETRAL", reason, error };
}

async function buildCard(symbol: string, catalog: Catalog | null): Promise<FuturesCard> {
  const diag: string[] = [];
  const known = catalog ? venueOf(catalog, symbol) : null;
  if (catalog && !known) {
    return failed(symbol, "spot", "Koin tidak ditemukan di Binance Spot maupun Futures.");
  }

  const futuresListed = catalog ? catalog.futures.includes(symbol) : true;
  const order: Venue[] = !catalog ? ["spot", "futures"] : known === "spot" ? (futuresListed ? ["spot", "futures"] : ["spot"]) : ["futures"];

  let venue: Venue = order[0];
  let market: Market | null = null;
  for (const v of order) {
    market = await fetchMarket(symbol, v, diag);
    if (market) {
      venue = v;
      break;
    }
  }

  const [derivs, candlesFirst] = await Promise.all([
    futuresListed ? fetchDerivs(symbol, diag) : Promise.resolve<Derivs | null>(null),
    market ? fetchCandles(symbol, venue, diag) : Promise.resolve(null),
  ]);
  let candles = candlesFirst;
  if (market && !candles && venue === "spot" && futuresListed) candles = await fetchCandles(symbol, "futures", diag);

  const hasFutures = futuresListed && derivs !== null;
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

  const base = { symbol, label: baseOf(symbol), venue, hasFutures, ok: true, metrics, derivatives, technical, error };

  if (technical) {
    const { bias, reason } = decide(technical.groups);
    const note = derivatives ? "" : " Koin ini tidak punya data derivatif, jadi keputusan hanya dari teknikal harian.";
    return { ...base, bias, reason: reason + note };
  }
  if (derivatives) {
    return { ...base, bias: derivatives.bias, reason: "Data teknikal harian belum tersedia, keputusan hanya dari screening derivatif." };
  }
  return { ...base, ok: false, bias: "NETRAL", reason: "Data belum bisa diambil, coba lagi sebentar lagi." };
}

export async function getFuturesSentiment(symbols: string[]): Promise<FuturesSnapshot> {
  const list = [...new Set(symbols.filter(isPair))].slice(0, MAX_WATCH);
  const catalog = await fetchCatalog();
  const cards = await Promise.all(list.map((s) => buildCard(s, catalog)));
  return { cards, updatedAt: Date.now() };
}
