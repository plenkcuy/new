import { NextResponse } from "next/server";
import { getFuturesSentiment } from "@/lib/futures/analyze";

export const preferredRegion = "sin1";
export const maxDuration = 30;

export async function GET() {
  const snapshot = await getFuturesSentiment();
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
