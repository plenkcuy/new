import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth";
import { sanitizeSnapshot, saveSnapshot } from "@/lib/futures/store";

export async function POST(request: Request) {
  const auth = await authorizeApi("premium");
  if (!auth.ok) return auth.response;

  const text = await request.text();
  if (text.length > 4096) return NextResponse.json({ error: "too_large" }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const saved = await saveSnapshot(auth.session.user.id, sanitizeSnapshot(body));
    return NextResponse.json({ saved }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "snapshot_failed" }, { status: 500 });
  }
}
