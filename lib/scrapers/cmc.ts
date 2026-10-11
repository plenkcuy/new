import "server-only";
import { compactUsd, type MarketItem, type OverviewItem } from "../shared";
import { fetchNextDataDetailed, toNumber } from "./next-data";
import type { ExploreResult } from "./pluang-explore";

const URL = "https://coinmarketcap.com/most-viewed-pages/";
const SYMBOL = /^[A-Za-z0-9$._]{1,15}$/;
const MAX_ITEMS = 20;

type Coin = {
  id?: number;
  name?: string;
  symbol?: string;
  marketCap?: number;
  priceChange?: { price?: number; priceChange24h?: number; priceChange7d?: number };
};

const percent = (value: unknown) => {
  const n = toNumber(value);
  return n === null ? null : n;
};

/** Koin yang paling banyak dilihat di CoinMarketCap (struktur sama dengan scraper crypto milikmu). */
export async function scrapeCmcMostViewed(): Promise<ExploreResult> {
  const outcome = await fetchNextDataDetailed(URL);
  if (!outcome.data) throw new Error(outcome.error ?? "gagal mengambil halaman");
  const data = outcome.data;

  const queries: { queryKey?: unknown[]; state?: { data?: { list?: Coin[] } } }[] = data.props?.dehydratedState?.queries ?? [];
  const list = queries.find((q) => Array.isArray(q?.queryKey) && q.queryKey[0] === "most-visited")?.state?.data?.list ?? [];

  const items: MarketItem[] = [];
  for (const coin of list) {
    const price = toNumber(coin.priceChange?.price);
    const symbol = String(coin.symbol ?? "");
    if (!SYMBOL.test(symbol) || price === null || price <= 0) continue;

    items.push({
      rank: items.length + 1,
      symbol: symbol.toUpperCase(),
      name: String(coin.name ?? symbol).slice(0, 80),
      price,
      changePct: percent(coin.priceChange?.priceChange24h),
      ccy: "USD",
      icon: Number.isInteger(coin.id) && (coin.id as number) > 0 ? `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png` : null,
      capLabel: toNumber(coin.marketCap) ? compactUsd(coin.marketCap as number) : null,
      change7d: percent(coin.priceChange?.priceChange7d),
    });
    if (items.length >= MAX_ITEMS) break;
  }
  if (items.length === 0) throw new Error("tidak ada koin yang terbaca dari halaman (struktur berubah?)");

  const gm = data.props?.pageProps?.globalMetrics;
  const overview: OverviewItem[] = [];
  if (gm) {
    const cap = toNumber(gm.marketCap);
    const volume = toNumber(gm.totalVol);
    const btc = toNumber(gm.btcDominance);
    const eth = toNumber(gm.ethDominance);
    if (cap) overview.push({ name: "Kapitalisasi pasar", value: compactUsd(cap), changePct: percent(gm.marketCapChange), group: "Crypto" });
    if (volume) overview.push({ name: "Volume 24 jam", value: compactUsd(volume), changePct: percent(gm.totalVolChange), group: "Crypto" });
    if (btc) overview.push({ name: "Dominasi BTC", value: `${btc.toFixed(2).replace(".", ",")}%`, changePct: null, group: "Crypto" });
    if (eth) overview.push({ name: "Dominasi ETH", value: `${eth.toFixed(2).replace(".", ",")}%`, changePct: null, group: "Crypto" });
  }

  return { items, overview, via: outcome.via ?? "axios" };
}
