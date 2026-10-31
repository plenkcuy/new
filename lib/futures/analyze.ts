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
import { FUTURES_SYMBOLS, fetchDailyCandles, fetchDerivatives, type RawDerivatives } from "./feed";

export type FuturesCard = {
  symbol: string;
  label: string;
  ok: boolean;
  metrics: RawDerivatives;
  derivatives: DerivativeResult | null;
  technical: { input: TechInput; groups: Groups } | null;
  bias: Bias;
  reason: string;
  error?: string;
};

export type FuturesSnapshot = { cards: FuturesCard[]; updatedAt: number };

const TTL_MS = 60_000;
let cache: FuturesSnapshot | null = null;

async function buildCard(symbol: string, label: string): Promise<FuturesCard> {
  const diag: string[] = [];
  const [metrics, candles] = await Promise.all([fetchDerivatives(symbol, diag), fetchDailyCandles(symbol, diag)]);
  const error = diag.length ? [...new Set(diag)].slice(0, 2).join(", ") : undefined;

  const derivatives =
    metrics.priceChange24h === null
      ? null
      : scoreDerivatives({
          priceChange24h: metrics.priceChange24h,
          oiChange24h: metrics.oiChange24h,
          funding: metrics.funding,
          ratio: metrics.ratio,
        });

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

  if (technical) {
    const { bias, reason } = decide(technical.groups);
    return { symbol, label, ok: true, metrics, derivatives, technical, bias, reason, error };
  }
  if (derivatives) {
    return {
      symbol,
      label,
      ok: true,
      metrics,
      derivatives,
      technical: null,
      bias: derivatives.bias,
      reason: "Data teknikal harian belum tersedia, keputusan hanya dari screening derivatif.",
      error,
    };
  }
  return { symbol, label, ok: false, metrics, derivatives: null, technical: null, bias: "NETRAL", reason: "Data belum bisa diambil, coba lagi sebentar lagi.", error };
}

export async function getFuturesSentiment(options: { fresh?: boolean } = {}): Promise<FuturesSnapshot> {
  if (!options.fresh && cache && Date.now() - cache.updatedAt < TTL_MS) return cache;
  const cards = await Promise.all(FUTURES_SYMBOLS.map((s) => buildCard(s.symbol, s.label)));
  const snapshot = { cards, updatedAt: Date.now() };
  if (cards.some((c) => c.ok)) cache = snapshot;
  return snapshot;
}
