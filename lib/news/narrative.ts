import "server-only";
import type { NewsMarket } from "./sources";

/**
 * Narasi: kategori berita berdasarkan kata kunci, ID dan EN.
 * Bobot dipakai untuk mengurutkan berita. Akuisisi, aliran dana asing, dan IPO paling dekat dengan keputusan pasar, jadi bobotnya paling besar.
 */
export const NARRATIVES = [
  { id: "akuisisi", label: "Akuisisi dan merger", weight: 3, pattern: /akuisisi|merger|mengakuisisi|acquisition|acquires?|buyout|takeover|diambil alih/i },
  { id: "asing", label: "Aliran dana asing", weight: 3, pattern: /net[ -]?(buy|sell)|dana asing|investor asing|asing (net|beli|jual|masuk|keluar)|foreign (inflow|outflow|investor)|capital (inflow|outflow)/i },
  { id: "ipo", label: "IPO dan listing", weight: 3, pattern: /\bIPO\b|pencatatan saham perdana|initial public offering|melantai di (bursa|BEI)/i },
  { id: "dividen", label: "Dividen dan buyback", weight: 2, pattern: /dividen|dividend|buy ?back|right issue|stock split|rights issue/i },
  { id: "suku-bunga", label: "Suku bunga dan inflasi", weight: 2, pattern: /suku bunga|BI rate|the fed|federal reserve|rate (cut|hike)|inflasi|inflation|\bCPI\b|nonfarm|jobs report/i },
  { id: "perang", label: "Geopolitik dan perang", weight: 2, pattern: /perang|\bwar\b|invasi|invasion|konflik|conflict|sanksi|sanction|tarif|tariff|geopolit|ketegangan|rudal|missile|embargo/i },
  { id: "teknologi", label: "Teknologi dan AI", weight: 2, pattern: /\bAI\b|kecerdasan buatan|artificial intelligence|chip|semikonduktor|semiconductor|nvidia|teknologi|blockchain|tokeni[sz]asi|tokeni[sz]ation/i },
  { id: "makro", label: "Ekonomi makro", weight: 1, pattern: /ekonomi|economy|\bGDP\b|\bPDB\b|pertumbuhan|resesi|recession|pengangguran|unemployment|rupiah|dolar|dollar|yield|obligasi|treasury/i },
  { id: "regulasi", label: "Regulasi dan ETF", weight: 2, pattern: /regulasi|regulation|\bOJK\b|\bSEC\b|aturan|kebijakan|policy|legislasi|legislation|\bETF\b|undang-undang/i },
  { id: "keamanan", label: "Keamanan dan hack", weight: 2, pattern: /hack|retas|peretasan|exploit|rug ?pull|scam|penipuan|dicuri|stolen/i },
  { id: "harga", label: "Pergerakan harga", weight: 1, pattern: /anjlok|ambruk|melonjak|rally|plunge|surge|crash|naik tajam|turun tajam|rekor|record high|liquidation|likuidasi/i },
] as const;

export type NarrativeId = (typeof NARRATIVES)[number]["id"];

const WEIGHT = new Map<string, number>(NARRATIVES.map((n) => [n.id, n.weight]));
const LABEL = new Map<string, string>(NARRATIVES.map((n) => [n.id, n.label]));

export const narrativeLabel = (id: string): string => LABEL.get(id) ?? id;
export const narrativeWeight = (id: string): number => WEIGHT.get(id) ?? 0;

/** Narasi yang masuk akal untuk tiap pasar. "Asing" dan "dividen" tidak dipakai untuk crypto. */
const MARKET_NARRATIVES: Record<NarrativeId, readonly NewsMarket[]> = {
  akuisisi: ["idx", "us", "crypto"],
  asing: ["idx", "us"],
  ipo: ["idx", "us", "crypto"],
  dividen: ["idx", "us"],
  "suku-bunga": ["idx", "us", "crypto"],
  perang: ["idx", "us", "crypto"],
  teknologi: ["idx", "us", "crypto"],
  makro: ["idx", "us", "crypto"],
  regulasi: ["idx", "us", "crypto"],
  keamanan: ["crypto"],
  harga: ["idx", "us", "crypto"],
};

export function tagsFor(text: string, market: NewsMarket): NarrativeId[] {
  return NARRATIVES.filter((n) => MARKET_NARRATIVES[n.id].includes(market) && n.pattern.test(text)).map((n) => n.id);
}
