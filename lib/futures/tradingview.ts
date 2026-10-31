import { isPair, type Venue } from "./symbols";

const EMBED_SRC = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

export function tvSymbol(symbol: string, venue: Venue): string {
  if (!isPair(symbol)) throw new Error("simbol tidak valid");
  return venue === "futures" ? `BINANCE:${symbol}.P` : `BINANCE:${symbol}`;
}

export function tvLink(symbol: string, venue: Venue): string {
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol(symbol, venue))}`;
}

const escapeForScript = (json: string) => json.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

export function chartDoc(symbol: string, venue: Venue): string {
  const config = escapeForScript(
    JSON.stringify({
      autosize: true,
      symbol: tvSymbol(symbol, venue),
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "id",
      backgroundColor: "#050a0a",
      allow_symbol_change: false,
      hide_side_toolbar: true,
      withdateranges: true,
      save_image: false,
      support_host: "https://www.tradingview.com",
    }),
  );
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    "<style>html,body{margin:0;height:100%;background:#050a0a}.tradingview-widget-container,.tradingview-widget-container__widget{height:100%;width:100%}</style>" +
    '</head><body><div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div>' +
    `<script type="text/javascript" src="${EMBED_SRC}" async>${config}</script>` +
    "</div></body></html>"
  );
}
