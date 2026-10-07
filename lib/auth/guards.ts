import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { FEATURE_MIN_TIER, type Feature } from "../plans";
import { deniedRedirect } from "./access";
import { getSession, type Session } from "./session";
import { hasTier } from "./tiers";
import type { Tier } from "./types";

/**
 * GUARD SERVER, lapisan otoritatif.
 * Panggil di SETIAP halaman/route handler yang dilindungi. Jangan hanya
 * mengandalkan middleware atau layout (layout tidak dirender ulang saat
 * navigasi antar-halaman).
 */

/** Wajib login. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Wajib login dan tier minimal `min`. `from` dipakai sebagai tujuan kembali setelah upgrade. */
export async function requireTier(min: Tier, from?: string): Promise<Session> {
  const session = await requireSession();
  if (!hasTier(session.user.tier, min)) redirect(deniedRedirect(min, from));
  return session;
}

/** Wajib memiliki fitur tertentu (lihat `FEATURE_MIN_TIER` di lib/plans.ts). */
export function requireFeature(feature: Feature, from?: string): Promise<Session> {
  return requireTier(FEATURE_MIN_TIER[feature], from);
}

export type ApiAuth = { ok: true; session: Session } | { ok: false; response: NextResponse };

/** Versi untuk route handler (`app/api/**`): mengembalikan 401/403 JSON, bukan redirect. */
export async function authorizeApi(min: Tier): Promise<ApiAuth> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  }
  if (!hasTier(session.user.tier, min)) {
    return { ok: false, response: NextResponse.json({ error: "forbidden", required: min }, { status: 403 }) };
  }
  return { ok: true, session };
}
