import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "./db";
import { SYMBOL_RULES } from "./journal-input";
import { getJson } from "./market-feed";
import { fetchQuotes } from "./quotes";
import type { AssetClass, Ccy } from "./shared";

export type SearchClass = "idx" | "us_stock" | "crypto";
export const SEARCH_CLASSES: readonly SearchClass[] = ["idx", "us_stock", "crypto"];
export const isSearchClass = (v: unknown): v is SearchClass => typeof v === "string" && (SEARCH_CLASSES as readonly string[]).includes(v);

export type HitKind = "recent" | "list" | "catalog" | "lookup";
export type AssetHit = { symbol: string; name: string | null; ccy: Ccy; kind: HitKind; price: number | null };

const MAX_RESULTS = 8;
const KIND_ORDER: Record<HitKind, number> = { recent: 0, list: 1, catalog: 2, lookup: 3 };

const ccyOf = (cls: SearchClass): Ccy => (cls === "idx" ? "IDR" : "USD");
const MARKET_OF: Record<"idx" | "us_stock", "idx" | "us"> = { idx: "idx", us_stock: "us" };

/** Huruf, angka, titik, dan spasi saja. Semua karakter lain dibuang sebelum dipakai di kueri apa pun. */
export function normalizeQuery(raw: string): string {
  return raw.normalize("NFKC").toUpperCase().replace(/[^A-Z0-9. ]/g, "").replace(/\s+/g, " ").trim().slice(0, 24);
}

/** Peringkat: kode sama persis, kode diawali, nama diawali, lalu mengandung. */
function rankOf(hit: AssetHit, code: string, text: string): number {
  if (!code) return 4;
  if (hit.symbol === code) return 0;
  if (hit.symbol.startsWith(code)) return 1;
  const name = (hit.name ?? "").toUpperCase();
  if (text && name.startsWith(text)) return 2;
  if (hit.symbol.includes(code) || (text && name.includes(text))) return 3;
  return 5;
}

/**
 * Menggabungkan kandidat dari beberapa sumber: satu hasil per kode (sumber paling spesifik menang),
 * diurutkan menurut kecocokan, lalu ditambah opsi "pakai kode ini" bila kode yang diketik belum ada.
 */
export function mergeHits(cls: SearchClass, query: string, groups: AssetHit[][]): AssetHit[] {
  const q = normalizeQuery(query);
  const code = q.replace(/ /g, "");
  const best = new Map<string, AssetHit>();
  for (const hit of groups.flat()) {
    const current = best.get(hit.symbol);
    if (!current || KIND_ORDER[hit.kind] < KIND_ORDER[current.kind]) {
      best.set(hit.symbol, { ...hit, name: hit.name ?? current?.name ?? null, price: hit.price ?? current?.price ?? null });
    } else {
      if (!current.name && hit.name) current.name = hit.name;
      if (current.price === null && hit.price !== null) current.price = hit.price;
    }
  }

  const ranked = [...best.values()]
    .map((hit) => ({ hit, rank: rankOf(hit, code, q) }))
    .filter((r) => r.rank < 5)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        KIND_ORDER[a.hit.kind] - KIND_ORDER[b.hit.kind] ||
        a.hit.symbol.length - b.hit.symbol.length ||
        a.hit.symbol.localeCompare(b.hit.symbol),
    )
    .map((r) => r.hit)
    .slice(0, MAX_RESULTS);

  if (code && !ranked.some((h) => h.symbol === code) && SYMBOL_RULES[cls].test(code)) {
    ranked.push({ symbol: code, name: null, ccy: ccyOf(cls), kind: "lookup", price: null });
  }
  return ranked;
}

const cleanName = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  return value.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || null;
};

/* ---------- Sumber ---------- */

/** Aset yang pernah dicatat pengguna ini. Hasilnya per pengguna, jadi tidak boleh masuk cache bersama. */
async function recentHits(userId: string, cls: SearchClass, code: string): Promise<AssetHit[]> {
  try {
    const rows = await db()`
      select a.symbol, a.name, max(t.traded_at) as last_at
      from journal_assets a
      join journal_trades t on t.asset_id = a.id
      where t.user_id = ${userId} and a.asset_class = ${cls}
        and (${code}::text = '' or a.symbol like ${code + "%"})
      group by a.symbol, a.name
      order by last_at desc
      limit 6`;
    return rows.map((r) => ({
      symbol: String(r.symbol),
      name: r.name && r.name !== r.symbol ? cleanName(r.name) : null,
      ccy: ccyOf(cls),
      kind: "recent" as const,
      price: null,
    }));
  } catch {
    return [];
  }
}

/** Daftar Pasar yang sudah di-scrape (data publik, sama untuk semua pengguna). */
async function listHits(cls: "idx" | "us_stock", code: string, text: string): Promise<AssetHit[]> {
  if (!code) return [];
  try {
    const rows = await db()`
      select distinct on (symbol) symbol, name, price::text as price
      from market_lists
      where market = ${MARKET_OF[cls]}
        and (symbol like ${code + "%"} or upper(coalesce(name, '')) like ${"%" + text + "%"})
      order by symbol, rank
      limit 30`;
    return rows
      .filter((r) => SYMBOL_RULES[cls].test(String(r.symbol)))
      .map((r) => {
        const price = Number(r.price);
        return {
          symbol: String(r.symbol),
          name: cleanName(r.name),
          ccy: ccyOf(cls),
          kind: "list" as const,
          price: Number.isFinite(price) && price > 0 ? price : null,
        };
      });
  } catch {
    return [];
  }
}

/** Semua pasangan USDT di Binance Spot. Data publik, jadi aman di-cache bersama selama 6 jam. */
const loadCryptoBases = unstable_cache(
  async (): Promise<string[]> => {
    const rows = await getJson("https://data-api.binance.vision/api/v3/ticker/price");
    if (!Array.isArray(rows)) throw new Error("katalog kosong");
    const bases = new Set<string>();
    for (const row of rows) {
      const symbol = typeof row?.symbol === "string" ? row.symbol : "";
      const match = symbol.match(/^([A-Z0-9]{2,12})USDT$/);
      if (match) bases.add(match[1]);
    }
    return [...bases].sort().slice(0, 4000);
  },
  ["asset-catalog-crypto-v1"],
  { revalidate: 6 * 60 * 60, tags: ["asset-catalog"] },
);

async function cryptoHits(code: string): Promise<AssetHit[]> {
  if (!code) return [];
  try {
    const bases = await loadCryptoBases();
    return bases
      .filter((b) => b.startsWith(code) || b.includes(code))
      .slice(0, 40)
      .map((symbol) => ({ symbol, name: null, ccy: "USD" as const, kind: "catalog" as const, price: null }));
  } catch {
    return [];
  }
}

export async function searchAssets(userId: string, cls: SearchClass, rawQuery: string): Promise<AssetHit[]> {
  const q = normalizeQuery(rawQuery);
  const code = q.replace(/ /g, "");
  const recents = recentHits(userId, cls, code);
  const lists = cls === "crypto" ? cryptoHits(code) : listHits(cls, code, q);
  return mergeHits(cls, q, await Promise.all([recents, lists]));
}

/* ---------- Harga dan nama untuk satu kode ---------- */

export type AssetQuote = {
  symbol: string;
  name: string | null;
  ccy: Ccy;
  price: number;
  changePct: number | null;
  source: string;
  t: number;
};

async function knownName(cls: "idx" | "us_stock", symbol: string): Promise<string | null> {
  try {
    const rows = await db()`select name from market_lists where market = ${MARKET_OF[cls]} and symbol = ${symbol} and name is not null limit 1`;
    return cleanName(rows[0]?.name);
  } catch {
    return null;
  }
}

/**
 * Harga terkini lewat scraper yang sudah ada (IDX: Pluang lalu Stockbit, US: Reku, crypto: Binance).
 * Kode divalidasi dengan aturan yang sama dengan form jurnal, jadi URL yang dibentuk scraper hanya
 * pernah berisi karakter yang lolos allowlist.
 */
export async function lookupAsset(cls: SearchClass, rawSymbol: string): Promise<AssetQuote | null> {
  const symbol = rawSymbol.trim().toUpperCase();
  if (!SYMBOL_RULES[cls as AssetClass].test(symbol)) return null;

  const quotes = await fetchQuotes([{ assetId: 0, assetClass: cls, symbol, chain: null, priceRef: symbol }], 30_000);
  const quote = quotes.get(0);
  if (!quote) return null;

  const name = cleanName(quote.name) ?? (cls === "crypto" ? null : await knownName(cls, symbol));
  return { symbol, name, ccy: ccyOf(cls), price: quote.price, changePct: quote.changePct, source: quote.source, t: quote.t };
}
