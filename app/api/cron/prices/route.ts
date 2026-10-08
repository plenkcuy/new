import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { refreshEverything } from "@/lib/market-feed";

export const maxDuration = 60;

function validSecret(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Dipanggil Vercel Cron setiap hari. Vercel mengirim header Authorization bila CRON_SECRET diisi. */
export async function GET(request: Request) {
  if (!validSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await refreshEverything(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "refresh_failed" }, { status: 500 });
  }
}
