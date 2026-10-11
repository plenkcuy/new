import "server-only";
import { assetIconUrl, compactUsd, safeIconUrl, type MarketItem, type OverviewItem } from "../shared";
import { fetchNextData, toNumber } from "./next-data";

type Market = "idx" | "us";

const URLS: Record<Market, string> = {
  idx: "https://pluang.com/explore/indo-market/stocks",
  us: "https://pluang.com/explore/us-market/stocks",
};
const ICON_BASE = "https://image-cdn.pluang.com/indo-stock/light/asset-icons";
const SYMBOL: Record<Market, RegExp> = { idx: /^[A-Z0-9]{2,6}$/, us: /^[A-Z.]{1,8}$/ };
const MAX_ITEMS = 20;
const MAX_OVERVIEW = 12;

export type ExploreResult = { items: MarketItem[]; overview: OverviewItem[] };

function iconOf(market: Market, symbol: string, raw: unknown): string | null {
  if (typeof raw === "string" && raw) {
    const direct = safeIconUrl(raw);
    if (direct) return direct;
    // Pluang kadang hanya mengirim nama file (mis. "/bbri.svg").
    if (market === "idx" && /^[\w./]+\.svg$/.test(raw)) return safeIconUrl(`${ICON_BASE}/${raw.replace(/^\/+/, "")}`);
  }
  return market === "idx" ? assetIconUrl("idx", symbol, null) : null;
}

function capLabelOf(value: unknown): string | null {
  const n = toNumber(value);
  if (n !== null && n > 0) return compactUsd(n);
  return typeof value === "string" && value.length <= 24 ? value : null;
}

/** Daftar saham dari halaman Explore Pluang (struktur sama dengan scraper watchlist milikmu). */
export async function scrapePluangExplore(market: Market, subCategory: string): Promise<ExploreResult | null> {
  const query = new URLSearchParams({ subCategory });
  if (market === "idx") query.set("page", "1");
  const data = (await fetchNextData(`${URLS[market]}?${query}`))?.props?.pageProps?.data;
  if (!data) return null;

  const items: MarketItem[] = [];
  for (const category of data.assetCategories ?? []) {
    for (const group of category.assetCategoryData ?? []) {
      for (const asset of group.assets ?? []) {
        const tile = asset.tileInfo ?? {};
        const quote = asset.display?.lastPriceAndPercentageChange ?? {};

        const symbol = String((market === "idx" ? tile.symbol ?? tile.displaySymbol : tile.displaySymbol ?? tile.symbol) ?? "").toUpperCase();
        const price = toNumber(quote.currentPrice);
        if (!SYMBOL[market].test(symbol) || price === null || price <= 0) continue;

        items.push({
          rank: items.length + 1,
          symbol,
          name: String(tile.name ?? symbol).slice(0, 80),
          price,
          changePct: toNumber(quote.percentageChange),
          ccy: market === "idx" ? "IDR" : "USD",
          icon: iconOf(market, symbol, tile.icon),
          capLabel: market === "us" ? capLabelOf(asset.display?.marketCap?.value) : null,
          change7d: null,
        });
        if (items.length >= MAX_ITEMS) break;
      }
    }
  }
  if (items.length === 0) return null;

  const overview: OverviewItem[] = [];
  for (const category of data.marketOverviewResult?.assetCategoryData ?? []) {
    for (const asset of category.assets ?? []) {
      if (!asset?.name || asset.formattedValue === undefined) continue;
      overview.push({
        name: String(asset.name).slice(0, 40),
        value: String(asset.formattedValue).slice(0, 24),
        changePct: toNumber(asset.percentageChange),
        group: category.title ? String(category.title).slice(0, 40) : null,
      });
      if (overview.length >= MAX_OVERVIEW) break;
    }
  }

  return { items, overview };
}
