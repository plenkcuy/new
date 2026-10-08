"use server";

// PENTING: setiap fungsi yang diekspor dari file "use server" menjadi endpoint publik.
// Hanya taruh aksi yang memang boleh dipanggil dari browser; guard & helper tetap di lib/auth.ts.

import { redirect } from "next/navigation";
import { safeNext } from "./access";
import { DEMO_USER_IDS, createSession, destroySession, userRepo } from "./auth";
import { getAuthSecret, isDemoAuthEnabled } from "./session";

/**
 * Login DEMO: memilih salah satu dari 3 akun contoh.
 * Ganti dengan login sungguhan (email+password / OAuth) sebelum dipakai pengguna nyata.
 */
export async function loginDemo(formData: FormData): Promise<void> {
  if (!isDemoAuthEnabled()) return redirect("/login?error=disabled");
  if (!getAuthSecret()) return redirect("/login?error=config");

  const userId = String(formData.get("userId") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  const allowed = (DEMO_USER_IDS as readonly string[]).includes(userId);
  const user = allowed ? await userRepo.findById(userId) : null;
  if (!user || user.status !== "active") return redirect("/login?error=invalid");

  await createSession(user);
  redirect(next);
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
