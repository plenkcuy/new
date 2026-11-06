import "server-only";
import type { NewsMarket } from "./sources";

/**
 * Filter relevansi per pasar, dipasang di level artikel.
 * Kueri Google News tidak selalu membatasi hasil dengan ketat (operator OR bisa meluas),
 * jadi setiap artikel dicek lagi dengan kata kunci pasarnya sendiri sebelum masuk daftar.
 *
 * Aturan:
 *   crypto: harus menyebut aset kripto, dan tidak menyebut istilah saham IDX
 *   idx:    harus menyebut istilah pasar IDX, dan tidak menyebut aset kripto
 *   us:     harus menyebut istilah pasar saham AS, dan tidak menyebut aset kripto atau IDX
 */

const CRYPTO = /bitcoin|\bBTC\b|ethereum|\bETH\b|crypto|kripto|altcoin|stablecoin|blockchain|\bdefi\b|solana|meme ?coin|coinbase|binance|\bNFT\b/i;
const IDX = /\bIHSG\b|\bIDX\b|\bBEI\b|bursa efek indonesia|\bsaham\b|emiten|rupiah|bank indonesia|\bOJK\b|\bLQ45\b|\bJCI\b/i;
// Kata khas emiten dan pasar Indonesia, untuk artikel yang tidak menyebut kata "saham" atau "IHSG".
const IDX_CONTEXT = /\bdividen\b|\blaba\b|\bTbk\b|\bBUMN\b|\bBBCA\b|\bBBRI\b|\bBMRI\b|\bTLKM\b|\bASII\b|\bBBNI\b|\bGOTO\b|\bKontan\b/i;
const US = /wall street|\bS&P ?500\b|\bNasdaq\b|dow jones|\bNYSE\b|\bstocks?\b|\bshares?\b|federal reserve|\bthe fed\b|\bearnings\b|\bIPO\b/i;

export function isRelevant(market: NewsMarket, text: string): boolean {
  switch (market) {
    case "crypto":
      return CRYPTO.test(text) && !IDX.test(text);
    case "idx":
      return (IDX.test(text) || IDX_CONTEXT.test(text)) && !CRYPTO.test(text);
    case "us":
      return US.test(text) && !CRYPTO.test(text) && !IDX.test(text);
  }
}
