import "server-only";

/**
 * Sumber berita untuk Pasar. Semua URL tetap di kode, tidak ada yang berasal dari input pengguna.
 *
 * Sumber utama: Google News RSS (pencarian kata kunci). Formatnya terdokumentasi di luar resmi:
 *   https://news.google.com/rss/search?q=...&hl=...&gl=...&ceid=...
 * Operator site: dipakai untuk membatasi hasil ke media tertentu, dan when:3d untuk berita tiga hari terakhir.
 *
 * Sumber langsung (feed publisher): dipasang sebagai tambahan. Kalau satu feed gagal, sumber lain tetap dipakai.
 */

export type NewsMarket = "idx" | "us" | "crypto";
export const NEWS_MARKETS: readonly NewsMarket[] = ["idx", "us", "crypto"];
export const isNewsMarket = (v: unknown): v is NewsMarket => typeof v === "string" && (NEWS_MARKETS as readonly string[]).includes(v);
export const NEWS_MARKET_LABEL: Record<NewsMarket, string> = { idx: "Saham IDX", us: "Saham US", crypto: "Crypto" };

type Edition = { hl: string; gl: string; ceid: string };
export const EDITION_ID: Edition = { hl: "id", gl: "ID", ceid: "ID:id" };
export const EDITION_US: Edition = { hl: "en-US", gl: "US", ceid: "US:en" };

export type SearchSource = { id: string; market: NewsMarket; query: string; edition: Edition };
export type DirectFeed = { id: string; market: NewsMarket; url: string };

export const SEARCH_SOURCES: SearchSource[] = [
  // Saham IDX
  { id: "idx-pasar", market: "idx", query: "(\"saham IDX\" OR IHSG OR \"Bursa Efek Indonesia\")", edition: EDITION_ID },
  { id: "idx-asing", market: "idx", query: "(\"net buy asing\" OR \"net sell asing\") saham", edition: EDITION_ID },
  { id: "idx-akuisisi", market: "idx", query: "akuisisi saham emiten", edition: EDITION_ID },
  { id: "idx-ipo", market: "idx", query: "(IPO OR \"pencatatan saham perdana\") BEI", edition: EDITION_ID },
  { id: "idx-emiten", market: "idx", query: "(dividen OR buyback OR \"right issue\") emiten", edition: EDITION_ID },
  { id: "idx-cnbc", market: "idx", query: "site:cnbcindonesia.com pasar saham", edition: EDITION_ID },
  { id: "idx-kontan", market: "idx", query: "site:kontan.co.id saham IHSG", edition: EDITION_ID },
  { id: "idx-investor", market: "idx", query: "site:investor.id saham emiten", edition: EDITION_ID },
  { id: "idx-bisnis", market: "idx", query: "site:bisnis.com saham IHSG", edition: EDITION_ID },

  // Saham US
  { id: "us-pasar", market: "us", query: "\"Wall Street\" stocks", edition: EDITION_US },
  { id: "us-indeks", market: "us", query: "(\"S&P 500\" OR Nasdaq) stocks", edition: EDITION_US },
  { id: "us-fed", market: "us", query: "Federal Reserve interest rates stocks", edition: EDITION_US },
  { id: "us-akuisisi", market: "us", query: "acquisition deal stocks merger", edition: EDITION_US },
  { id: "us-ipo", market: "us", query: "IPO Wall Street listing shares", edition: EDITION_US },
  { id: "us-ekonomi", market: "us", query: "US economy inflation jobs report", edition: EDITION_US },
  { id: "us-cnbc", market: "us", query: "site:cnbc.com stock market", edition: EDITION_US },
  { id: "us-reuters", market: "us", query: "site:reuters.com stock market", edition: EDITION_US },

  // Crypto
  { id: "crypto-pasar", market: "crypto", query: "(bitcoin OR ethereum) price", edition: EDITION_US },
  { id: "crypto-etf", market: "crypto", query: "crypto ETF flows bitcoin", edition: EDITION_US },
  { id: "crypto-regulasi", market: "crypto", query: "crypto regulation SEC stablecoin", edition: EDITION_US },
  { id: "crypto-keamanan", market: "crypto", query: "crypto (hack OR exploit OR liquidation)", edition: EDITION_US },
  { id: "crypto-makro", market: "crypto", query: "(inflation OR \"US economy\") bitcoin", edition: EDITION_US },
  { id: "crypto-perang", market: "crypto", query: "(war OR tariffs) crypto", edition: EDITION_US },
  { id: "crypto-id", market: "crypto", query: "kripto (bitcoin OR ethereum)", edition: EDITION_ID },
  { id: "crypto-coindesk", market: "crypto", query: "site:coindesk.com (bitcoin OR crypto)", edition: EDITION_US },
  { id: "crypto-theblock", market: "crypto", query: "site:theblock.co crypto", edition: EDITION_US },
];

/** Feed publisher langsung. Dicoba tiap kali cache kedaluwarsa, dan dilewati kalau gagal. */
// URL di bawah sudah dicek terhadap daftar feed publik (Feeder, dokumentasi MCP CoinDesk, dan daftar feed Investing.com).
export const DIRECT_FEEDS: DirectFeed[] = [
  { id: "cnbc-top", market: "us", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
  { id: "investing-news", market: "us", url: "https://www.investing.com/rss/news.rss" },
  { id: "investing-stock", market: "us", url: "https://www.investing.com/rss/news_25.rss" },
  { id: "coindesk", market: "crypto", url: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml" },
  { id: "cointelegraph", market: "crypto", url: "https://cointelegraph.com/rss" },
  { id: "decrypt", market: "crypto", url: "https://decrypt.co/feed" },
  { id: "the-block", market: "crypto", url: "https://www.theblock.co/rss.xml" },
  { id: "investing-crypto", market: "crypto", url: "https://www.investing.com/rss/news_301.rss" },
  { id: "bitcoin-magazine", market: "crypto", url: "https://bitcoinmagazine.com/feed" },
];
