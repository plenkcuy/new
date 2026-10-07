"use server";

import { redirect } from "next/navigation";
import { getAuthSecret, isDemoAuthEnabled } from "./config";
import { safeNext } from "./access";
import { createSession, destroySession } from "./session";
import { DEMO_USER_IDS, userRepo } from "./users";

/**
 * Login DEMO: memilih salah satu dari 3 akun contoh.
 * Ganti dengan login sungguhan (email+password / OAuth) sebelum dipakai pengguna nyata.
 */
export async function loginDemo(formData: FormData): Promise<void> {
  if (!isDemoAuthEnabled()) redirect("/login?error=disabled");
  if (!getAuthSecret()) redirect("/login?error=config");

  const userId = String(formData.get("userId") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  const allowed = (DEMO_USER_IDS as readonly string[]).includes(userId);
  const user = allowed ? await userRepo.findById(userId) : null;
  if (!user || user.status !== "active") redirect("/login?error=invalid");

  await createSession(user);
  redirect(next);
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
