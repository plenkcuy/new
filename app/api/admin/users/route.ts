import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/guards";
import { getUsers } from "@/lib/data/admin";
import { FEATURE_MIN_TIER } from "@/lib/plans";

/** Contoh API khusus Admin. Dijaga middleware DAN guard ini (defense in depth). */
export async function GET() {
  const auth = await authorizeApi(FEATURE_MIN_TIER["admin-panel"]);
  if (!auth.ok) return auth.response;

  const users = await getUsers();
  return NextResponse.json(
    { users: users.map(({ id, name, email, tier, status }) => ({ id, name, email, tier, status })) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}