import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "./config";
import { signToken, verifyToken } from "./token";
import type { SessionUser, User } from "./types";
import { userRepo } from "./users";

export type Session = { user: SessionUser };

/** Menulis cookie sesi bertanda tangan. Panggil lagi setelah tier pengguna berubah. */
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
