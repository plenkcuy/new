import { NextResponse } from "next/server";
import { limitsFor } from "@/lib/access";
import { authorizeApi } from "@/lib/auth";
import { loadTradeRows, openTargets } from "@/lib/journal";
import { fetchQuotes, fetchUsdIdrLive } from "@/lib/quotes";
import type { LiveQuote } from "@/lib/shared";

/**
 * Harga terkini untuk posisi terbuka milik pengguna yang sedang login.
 * Daftar aset diambil dari jurnal di server, bukan dari parameter, jadi endpoint ini tidak bisa
 * dipakai sebagai proxy ke sumber data. Free diperbarui paling cepat tiap 60 detik, Premium tiap 10 detik.
 */
export async function GET() {
  const auth = await authorizeApi("free");
  if (!auth.ok) return auth.response;

  const { user } = auth.session;
  const maxAgeMs = limitsFor(user.tier).marketFeed === "realtime" ? 10_000 : 60_000;

  try {
    const targets = openTargets(await loadTradeRows(user.id));
    const [quotes, usdIdr] = await Promise.all([fetchQuotes(targets, maxAgeMs), fetchUsdIdrLive(maxAgeMs)]);

    const body: Record<string, LiveQuote> = {};
    for (const [assetId, q] of quotes) body[assetId] = { price: q.price, changePct: q.changePct, source: q.source };

    return NextResponse.json({ t: Date.now(), usdIdr, quotes: body }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "prices_unavailable" }, { status: 503 });
  }
}
