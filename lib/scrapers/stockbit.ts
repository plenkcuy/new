import "server-only";
import { safeIconUrl } from "../shared";
import { fetchNextData, toNumber, type ScrapedQuote } from "./next-data";

const BASE_URL = "https://stockbit.com/symbol";
const SYMBOL = /^[A-Z0-9]{2,6}$/;

export type StockbitQuote = ScrapedQuote & { name: string | null; exchange: string | null };

const positive = (value: unknown): number | null => {
  const n = toNumber(value);
  return n !== null && n > 0 ? n : null;
};

/** Teks dari sumber luar dibersihkan seperti input pengguna: tanpa karakter kontrol atau tanda kurung sudut, dan dibatasi panjangnya. */
const cleanText = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
  return text || null;
};

/**
 * Harga dan nama saham IDX dari halaman simbol Stockbit (pageProps.company di __NEXT_DATA__).
 * Dipakai sebagai cadangan bila Pluang gagal, dan sebagai sumber nama perusahaan.
 */
export async function scrapeStockbit(symbol: string): Promise<StockbitQuote | null> {
  if (!SYMBOL.test(symbol)) return null;

  const data = await fetchNextData(`${BASE_URL}/${encodeURIComponent(symbol)}`);
  const page = data?.props?.pageProps;
  const company = page?.company;
  if (!company) return null;

  // Halaman bisa mengalihkan ke simbol lain. Pastikan yang kembali memang yang diminta.
  const returned = String(page.symbol ?? company.symbol ?? "").toUpperCase();
  if (returned !== symbol) return null;

  const price = positive(company.price);
  if (price === null) return null;

  const previous = positive(company.previous);
  const reported = toNumber(company.percentage);
  return {
    price,
    changePct: reported ?? (previous ? (price / previous - 1) * 100 : null),
    icon: safeIconUrl(company.icon_url),
    name: cleanText(company.name, 80),
    exchange: cleanText(company.exchange, 12),
  };
}
