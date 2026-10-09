import "server-only";
import { safeIconUrl } from "../shared";
import { fetchNextData, positive, type ScrapedQuote } from "./next-data";

const BASE_URL = "https://pluang.com/asset/indo-stock";
const ICON_BASE = "https://image-cdn.pluang.com/indo-stock/light/asset-icons";

/** Harga saham IDX dari halaman Pluang (pageProps.assetCurrentPrice). */
export async function scrapePluangPrice(symbol: string): Promise<ScrapedQuote | null> {
  if (!/^[A-Z0-9]{2,6}$/.test(symbol)) return null;

  const data = await fetchNextData(`${BASE_URL}/${encodeURIComponent(symbol)}`);
  const pageProps = data?.props?.pageProps;
  if (!pageProps) return null;

  const price = positive(pageProps.assetCurrentPrice) ?? positive(pageProps.assetQuote?.lap);
  if (price === null) return null;

  const previous = positive(pageProps.assetQuote?.prev);

  // Ikon: stockIconBaseUrl + nama file dari assetDescription.icon (varian light).
  const file = pageProps.assetDescription?.icon;
  const base = String(pageProps.assetConfig?.stockIconBaseUrl ?? ICON_BASE).replace(/\/+$/, "");
  const icon = file ? safeIconUrl(`${base}/${String(file).replace(/^\/+/, "")}`) : null;

  return { price, changePct: previous ? (price / previous - 1) * 100 : null, icon };
}
