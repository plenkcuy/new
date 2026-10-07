import "server-only";
import { CASH, getHoldings, getPerformanceSeries } from "./market";

export type Analytics = {
  /** Return 1 tahun (%). */
  annualReturn: number;
  /** Volatilitas tahunan (%). */
  volatility: number;
  sharpe: number;
  /** Penurunan maksimum (%) — bernilai negatif. */
  maxDrawdown: number;
  sectors: { label: string; value: number; share: number }[];
  contributors: { symbol: string; name: string; pnl: number; pnlPct: number }[];
};

const RISK_FREE_PCT = 6;
const WEEKS_PER_YEAR = 52;

const average = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Metrik risiko dihitung dari deret tiruan 1 tahun (mingguan). Bukan saran investasi. */
export async function getAnalytics(): Promise<Analytics> {
  const [series, holdings] = await Promise.all([getPerformanceSeries("1Y"), getHoldings()]);

  const returns = series.slice(1).map((p, i) => p.value / series[i].value - 1);
  const mean = average(returns);
  const stdev = Math.sqrt(average(returns.map((r) => (r - mean) ** 2)));

  const annualReturn = (series[series.length - 1].value / series[0].value - 1) * 100;
  const volatility = stdev * Math.sqrt(WEEKS_PER_YEAR) * 100;
  const sharpe = volatility === 0 ? 0 : (annualReturn - RISK_FREE_PCT) / volatility;

  let peak = series[0].value;
  let maxDrawdown = 0;
  for (const point of series) {
    peak = Math.max(peak, point.value);
    maxDrawdown = Math.min(maxDrawdown, (point.value / peak - 1) * 100);
  }

  const bySector = new Map<string, number>([["Kas", CASH]]);
  for (const h of holdings) {
    bySector.set(h.sector, (bySector.get(h.sector) ?? 0) + h.units * h.price);
  }
  const total = [...bySector.values()].reduce((a, b) => a + b, 0);
  const sectors = [...bySector.entries()]
    .map(([label, value]) => ({ label, value, share: (value / total) * 100 }))
    .sort((a, b) => b.value - a.value);

  const contributors = holdings
    .map((h) => ({
      symbol: h.symbol,
      name: h.name,
      pnl: h.units * (h.price - h.avgPrice),
      pnlPct: (h.price / h.avgPrice - 1) * 100,
    }))
    .sort((a, b) => b.pnl - a.pnl);

  return { annualReturn, volatility, sharpe, maxDrawdown, sectors, contributors };
}
