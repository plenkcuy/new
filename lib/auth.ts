import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { FEATURE_MIN_TIER, deniedRedirect, hasTier, type Feature } from "./access";
import { SESSION_COOKIE, SESSION_MAX_AGE, signToken, verifyToken } from "./session";
import type { SessionUser, Tier, User } from "./shared";

/* ============================================================
 * 1. Repository pengguna
 *    SAAT INI: data contoh di memori. Ganti isi `userRepo` dengan query
 *    database (Prisma/Drizzle/Supabase); kode lain tidak perlu diubah.
 * ============================================================ */

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  list(): Promise<User[]>;
}

const USERS: readonly User[] = [
  { id: "u_free", name: "Raka Aditya", email: "raka@lumen.example", tier: "free", status: "active", createdAt: "2026-03-14", lastActiveAt: "2026-10-07" },
  { id: "u_premium", name: "Maya Putri", email: "maya@lumen.example", tier: "premium", status: "active", createdAt: "2025-11-03", lastActiveAt: "2026-10-07" },
  { id: "u_admin", name: "Sinta Wijaya", email: "sinta@lumen.example", tier: "admin", status: "active", createdAt: "2025-06-20", lastActiveAt: "2026-10-07" },
  { id: "u_4", name: "Budi Santoso", email: "budi@lumen.example", tier: "free", status: "active", createdAt: "2026-05-02", lastActiveAt: "2026-10-05" },
  { id: "u_5", name: "Citra Lestari", email: "citra@lumen.example", tier: "premium", status: "active", createdAt: "2025-12-18", lastActiveAt: "2026-10-06" },
  { id: "u_6", name: "Dimas Pratama", email: "dimas@lumen.example", tier: "free", status: "suspended", createdAt: "2026-01-09", lastActiveAt: "2026-08-21" },
  { id: "u_7", name: "Eka Nugroho", email: "eka@lumen.example", tier: "premium", status: "active", createdAt: "2026-02-27", lastActiveAt: "2026-10-04" },
  { id: "u_8", name: "Fitri Handayani", email: "fitri@lumen.example", tier: "free", status: "active", createdAt: "2026-07-30", lastActiveAt: "2026-10-03" },
];

export const userRepo: UserRepository = {
  async findById(id) {
    return USERS.find((user) => user.id === id) ?? null;
  },
  async list() {
    return [...USERS];
  },
};

/** Hanya akun ini yang boleh dipakai lewat login demo. */
export const DEMO_USER_IDS = ["u_free", "u_premium", "u_admin"] as const;

/* ============================================================
 * 2. Sesi (cookie bertanda tangan)
 * ============================================================ */

export type Session = { user: SessionUser };

/** Menulis cookie sesi. Panggil lagi setelah tier pengguna berubah. */
export async function createSession(user: Pick<User, "id" | "tier">): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const token = await signToken({ sub: user.id, tier: user.tier, exp });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/**
 * Sesi otoritatif: tanda tangan diverifikasi, lalu pengguna dibaca ulang dari
 * repository, jadi tier selalu terbaru dan akun yang dibekukan langsung ditolak.
 * Di-cache per request supaya aman dipanggil berkali-kali.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await userRepo.findById(payload.sub);
  if (!user || user.status !== "active") return null;

  return { user: { id: user.id, name: user.name, email: user.email, tier: user.tier } };
});

/* ============================================================
 * 3. Guard server, lapisan OTORITATIF.
 *    Panggil di SETIAP page/route handler yang dilindungi. Jangan hanya
 *    mengandalkan middleware atau layout (layout tidak dirender ulang saat
 *    navigasi antar-halaman).
 * ============================================================ */

/** Wajib login. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Wajib login dan tier minimal `min`. `from` = tujuan kembali setelah upgrade. */
export async function requireTier(min: Tier, from?: string): Promise<Session> {
  const session = await requireSession();
  if (!hasTier(session.user.tier, min)) redirect(deniedRedirect(min, from));
  return session;
}

/** Wajib memiliki fitur tertentu (lihat `FEATURE_MIN_TIER` di lib/access.ts). */
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
