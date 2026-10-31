import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getFuturesSentiment } from "@/lib/futures/analyze";
import { saveSnapshot } from "@/lib/futures/store";

export const preferredRegion = "sin1";
export const maxDuration = 30;

function validSecret(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: Request) {
  if (!validSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const snapshot = await getFuturesSentiment({ fresh: true });
    const saved = await saveSnapshot(snapshot);
    return NextResponse.json({ saved }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "snapshot_failed" }, { status: 500 });
  }
}
