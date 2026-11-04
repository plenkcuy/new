import "server-only";
import { CHAINS, safeIconUrl, type Chain } from "./shared";

/**
 * Klien API publik DexScreener (tanpa kunci). Dipakai untuk pencarian meme coin di jurnal,
 * harga, dan daftar Pasar. Pengamanan mengikuti pedoman OWASP SSRF:
 *   - host tetap, tidak pernah dibentuk dari input pengguna
 *   - chain lewat allowlist, alamat lewat validasi regex per chain, lalu di-encode sebelum masuk URL
 *   - redirect ditolak (redirect: "error") supaya tujuan tidak bisa dialihkan ke host lain
 *   - batas waktu dan ukuran respons, serta bentuk data diperiksa sebelum dipakai
 * Batas resmi DexScreener: 300 permintaan per menit untuk pair dan pencarian, 60 per menit untuk boost.
 */

const BASE = "https://api.dexscreener.com";
const TIMEOUT_MS = 8000;
const MAX_BYTES = 2_000_000;
const EVM = /^0x[a-fA-F0-9]{40}$/;
const SOLANA = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
/** Sama dengan aturan kode meme di jurnal (lib/journal-input.ts). */
const SYMBOL = /^[A-Za-z0-9$_.]{1,20}$/;

export type DexPair = {
  chain: Chain;
  contract: string;
  symbol: string;
  name: string | null;
  price: number;
  changePct: number | null;
  liquidity: number;
  marketCap: number | null;
  icon: string | null;
};

const obj = (v: unknown): Record<string, unknown> => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

const num = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  return v.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max) || null;
};

export const isDexChain = (v: unknown): v is Chain => typeof v === "string" && (CHAINS as readonly string[]).includes(v);

export const isTokenAddress = (chain: Chain, v: string): boolean => (chain === "solana" ? SOLANA.test(v) : EVM.test(v));

/** Alamat EVM disimpan huruf kecil, Solana tetap apa adanya (case sensitive). */
export const canonicalAddress = (chain: Chain, v: string): string => (chain === "solana" ? v : v.toLowerCase());

export const looksLikeAddress = (v: string): boolean => EVM.test(v) || SOLANA.test(v);

async function fetchJson(path: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Accept: "application/json" },
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) return null;
    const body = await res.text();
    if (body.length > MAX_BYTES) return null;
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function toPair(raw: unknown): DexPair | null {
  const p = obj(raw);
  if (!isDexChain(p.chainId)) return null;
  const chain = p.chainId;
  const base = obj(p.baseToken);
  const address = typeof base.address === "string" ? base.address : "";
  if (!isTokenAddress(chain, address)) return null;

  const symbol = text(base.symbol, 20);
  if (!symbol || !SYMBOL.test(symbol)) return null;
  const price = num(p.priceUsd);
  if (price === null || price <= 0) return null;

  const info = obj(p.info);
  return {
    chain,
    contract: canonicalAddress(chain, address),
    symbol,
    name: text(base.name, 80),
    price,
    changePct: num(obj(p.priceChange).h24),
    liquidity: num(obj(p.liquidity).usd) ?? 0,
    marketCap: num(p.marketCap) ?? num(p.fdv),
    icon: safeIconUrl(info.imageUrl),
  };
}

/** Satu pair per token: yang likuiditasnya paling besar. */
function bestPerToken(pairs: DexPair[]): DexPair[] {
  const best = new Map<string, DexPair>();
  for (const pair of pairs) {
    const key = `${pair.chain}:${pair.contract}`;
    const current = best.get(key);
    if (!current || pair.liquidity > current.liquidity) best.set(key, pair);
  }
  return [...best.values()];
}

const pairList = (data: unknown): unknown[] => {
  const pairs = obj(data).pairs;
  return Array.isArray(pairs) ? pairs : [];
};

/** Cari pair dari nama, simbol, atau alamat kontrak. Hasil diurutkan menurut likuiditas. */
export async function searchDexPairs(query: string): Promise<DexPair[]> {
  const q = query.trim().slice(0, 64);
  if (!q) return [];
  const data = looksLikeAddress(q)
    ? await fetchJson(`/latest/dex/tokens/${encodeURIComponent(q)}`)
    : await fetchJson(`/latest/dex/search?q=${encodeURIComponent(q)}`);
  return bestPerToken(pairList(data).map(toPair).filter((p): p is DexPair => p !== null))
    .sort((a, b) => b.liquidity - a.liquidity)
    .slice(0, 30);
}

/** Pair terbaik untuk daftar alamat pada satu chain (maksimal 30 per permintaan). */
export async function pairsForTokens(chain: Chain, addresses: string[]): Promise<DexPair[]> {
  const valid = addresses.filter((a) => isTokenAddress(chain, a)).slice(0, 30);
  if (valid.length === 0) return [];
  const data = await fetchJson(`/tokens/v1/${chain}/${valid.map((a) => encodeURIComponent(a)).join(",")}`);
  const list = Array.isArray(data) ? data : [];
  return bestPerToken(list.map(toPair).filter((p): p is DexPair => p !== null));
}

/** Harga terkini satu token dari pair likuiditas terbesar di chain yang diminta. */
export async function dexQuoteFor(chain: Chain, contract: string): Promise<DexPair | null> {
  if (!isTokenAddress(chain, contract)) return null;
  const data = await fetchJson(`/latest/dex/tokens/${encodeURIComponent(contract)}`);
  const want = canonicalAddress(chain, contract);
  const pairs = pairList(data)
    .map(toPair)
    .filter((p): p is DexPair => p !== null && p.chain === chain && p.contract === want);
  return bestPerToken(pairs)[0] ?? null;
}

/** Token yang sedang paling banyak di-boost, urutan dari DexScreener dipertahankan. */
export async function topBoostedTokens(): Promise<{ chain: Chain; address: string }[]> {
  const data = await fetchJson("/token-boosts/top/v1");
  const list = Array.isArray(data) ? data : [];
  const seen = new Set<string>();
  const out: { chain: Chain; address: string }[] = [];
  for (const raw of list) {
    const row = obj(raw);
    if (!isDexChain(row.chainId) || typeof row.tokenAddress !== "string") continue;
    if (!isTokenAddress(row.chainId, row.tokenAddress)) continue;
    const address = canonicalAddress(row.chainId, row.tokenAddress);
    const key = `${row.chainId}:${address}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ chain: row.chainId, address });
    if (out.length >= 30) break;
  }
  return out;
}
