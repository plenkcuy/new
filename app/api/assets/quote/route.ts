import { NextResponse } from "next/server";
import { isSearchClass, lookupAsset } from "@/lib/asset-search";
import { authorizeApi } from "@/lib/auth";
import { canonicalAddress, isDexChain, isTokenAddress } from "@/lib/dexscreener";
import { rateLimit } from "@/lib/rate-limit";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const auth = await authorizeApi("free");
  if (!auth.ok) return auth.response;

  const userId = auth.session.user.id;
  const limit = rateLimit(`asset-quote:${userId}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfter) } });
  }

  const params = new URL(request.url).searchParams;
  const cls = params.get("class");
  const symbol = params.get("symbol") ?? "";
  if (!isSearchClass(cls) || symbol.length > 20) return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });

  // Meme coin: chain dan alamat kontrak wajib, dan keduanya divalidasi sebelum dipakai untuk memanggil DexScreener.
  let meme: { chain: "solana" | "ethereum" | "base" | "bsc"; contract: string } | undefined;
  if (cls === "meme") {
    const chain = params.get("chain");
    const contract = params.get("contract") ?? "";
    if (!isDexChain(chain) || !isTokenAddress(chain, contract)) {
      return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
    }
    meme = { chain, contract: canonicalAddress(chain, contract) };
  }

  try {
    const quote = await lookupAsset(cls, symbol, meme);
    if (!quote) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    return NextResponse.json(quote, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "quote_failed" }, { status: 500, headers: NO_STORE });
  }
}
