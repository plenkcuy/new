import "server-only";
import { safeIconUrl } from "../shared";
import { fetchNextData, positive, type ScrapedQuote } from "./next-data";

const BASE_URL = "https://reku.id/saham-as";

type Query = { queryKey?: unknown[]; state?: { data?: any } };

/** Harga saham US dari halaman Reku (query "market-stock" di dehydratedState). */
export async function scrapeRekuPrice(symbol: string): Promise<ScrapedQuote | null> {
  if (!/^[A-Z.]{1,6}$/.test(symbol)) return null;

  const data = await fetchNextData(`${BASE_URL}/${encodeURIComponent(symbol)}`);
  const queries: Query[] = data?.props?.pageProps?.dehydratedState?.queries ?? [];
  const market = queries.find((q) => Array.isArray(q?.queryKey) && q.queryKey[0] === "market-stock")?.state?.data;
  const price = market?.price;
  if (!price) return null;

  const current = positive(price.close) ?? positive(price.closeCore);
  if (current === null) return null;

  const reported = price.changePercentage?.default;
  const previous = positive(price.previousClose);
  const changePct = typeof reported === "number" ? reported : previous ? (current / previous - 1) * 100 : null;
  return { price: current, changePct, icon: safeIconUrl(market.logo) };
}
