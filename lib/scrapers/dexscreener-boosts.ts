import "server-only";
import { canonicalAddress, pairsForTokens, topBoostedTokens, type DexPair } from "../dexscreener";
import { compactUsd, type Chain, type MarketItem } from "../shared";
import type { ExploreResult } from "./pluang-explore";

/** Meme coin yang paling sering di-boost di DexScreener, dengan harga dari pair likuiditas terbesar. */
export async function scrapeDexBoosts(): Promise<ExploreResult> {
  const boosted = await topBoostedTokens();
  if (boosted.length === 0) throw new Error("daftar boost kosong atau tidak bisa dijangkau");

  const byChain = new Map<Chain, string[]>();
  for (const token of boosted) byChain.set(token.chain, [...(byChain.get(token.chain) ?? []), token.address]);

  const pairs = new Map<string, DexPair>();
  for (const [chain, addresses] of byChain) {
    for (const pair of await pairsForTokens(chain, addresses)) pairs.set(`${pair.chain}:${pair.contract}`, pair);
  }

  const items: MarketItem[] = [];
  for (const token of boosted) {
    const pair = pairs.get(`${token.chain}:${canonicalAddress(token.chain, token.address)}`);
    if (!pair) continue;
    items.push({
      rank: items.length + 1,
      symbol: pair.symbol,
      name: pair.name ?? pair.symbol,
      price: pair.price,
      changePct: pair.changePct,
      ccy: "USD",
      icon: pair.icon,
      capLabel: pair.marketCap ? compactUsd(pair.marketCap) : null,
      change7d: null,
    });
  }
  if (items.length === 0) throw new Error("tidak ada pair yang terbaca untuk token yang di-boost");
  return { items, overview: [], via: "axios" };
}
