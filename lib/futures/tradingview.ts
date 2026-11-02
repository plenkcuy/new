import { isPair, type Venue } from "./symbols";

/**
 * Format embed resmi TradingView: https://s.tradingview.com/embed-widget/{nama}/?locale={locale}#{opsi JSON ter-encode}.
 * Dimuat langsung sebagai iframe lintas origin. Jangan dibungkus iframe `srcdoc` ber-sandbox tanpa
 * `allow-same-origin`: sandbox diwariskan ke iframe di dalamnya, sehingga widget mendapat origin buntu
 * dan tidak bisa memakai storage (chart jadi kosong).
 */
const EMBED_HOST = "https://s.tradingview.com";

export function tvSymbol(symbol: string, venue: Venue): string {
  if (!isPair(symbol)) throw new Error("simbol tidak valid");
  return venue === "futures" ? `BINANCE:${symbol}.P` : `BINANCE:${symbol}`;
}

export function tvLink(symbol: string, venue: Venue): string {
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol(symbol, venue))}`;
}

export function chartUrl(symbol: string, venue: Venue, locale = "id"): string {
  const options = {
    autosize: true,
    symbol: tvSymbol(symbol, venue),
    interval: "D",
    timezone: "Etc/UTC",
    theme: "dark",
    style: "1",
    locale,
    backgroundColor: "#050a0a",
    allow_symbol_change: false,
    hide_side_toolbar: true,
    withdateranges: true,
    save_image: false,
    support_host: "https://www.tradingview.com",
  };
  return `${EMBED_HOST}/embed-widget/advanced-chart/?locale=${locale}#${encodeURIComponent(JSON.stringify(options))}`;
}
