import { NextResponse } from "next/server";
import { isSearchClass, searchAssets } from "@/lib/asset-search";
import { authorizeApi } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const auth = await authorizeApi("free");
  if (!auth.ok) return auth.response;

  const userId = auth.session.user.id;
  const limit = rateLimit(`asset-search:${userId}`, 40, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfter) } });
  }

  const params = new URL(request.url).searchParams;
  const cls = params.get("class");
  if (!isSearchClass(cls)) return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });

  try {
    const results = await searchAssets(userId, cls, (params.get("q") ?? "").slice(0, 64));
    return NextResponse.json({ results }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "search_failed" }, { status: 500, headers: NO_STORE });
  }
}
