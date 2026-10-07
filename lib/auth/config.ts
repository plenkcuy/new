/**
 * Konfigurasi autentikasi. Aman dipakai di Edge (middleware) maupun Node.
 */

export const SESSION_COOKIE = "lumen_session";

/** Masa berlaku sesi (detik). 8 jam. */
export const SESSION_MAX_AGE = 60 * 60 * 8;

/**
 * Rahasia penandatangan cookie sesi.
 * - Production: wajib `AUTH_SECRET` (minimal 32 karakter). Jika kosong, sesi
 *   dianggap tidak valid (fail closed).
 * - Development: memakai rahasia bawaan agar `npm run dev` langsung jalan.
 */
export function getAuthSecret(): string | null {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== "production") {
    return "dev-only-secret-never-use-in-production-0000";
  }
  return null;
}

/**
 * Login demo (3 akun contoh).
 * - Development: aktif secara bawaan.
 * - Production: MATI kecuali `DEMO_AUTH=true`. Jangan aktifkan untuk pengguna nyata.
 */
export function isDemoAuthEnabled(): boolean {
  const flag = process.env.DEMO_AUTH;
  if (flag) return flag === "true";
  return process.env.NODE_ENV !== "production";
}
