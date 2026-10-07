/**
 * Aturan akses rute: SATU sumber kebenaran untuk middleware, sidebar, dan guard.
 * Aman di Edge. Jangan impor kode server-only di sini.
 */
import type { Tier } from "./types";

/** Rute tanpa login. Semua rute lain wajib login. */
export const PUBLIC_ROUTES = ["/login"] as const;

/**
 * Tier minimum per awalan rute. Rute yang tidak tercantum = "free" (cukup login).
 * Yang paling spesifik (awalan terpanjang) menang.
 */
export const ROUTE_RULES: ReadonlyArray<{ prefix: string; min: Tier }> = [
  { prefix: "/admin", min: "admin" },
  { prefix: "/api/admin", min: "admin" },
  { prefix: "/analysis", min: "premium" },
  { prefix: "/community", min: "premium" },
  { prefix: "/api/portfolio/export", min: "premium" },
];

/** Cocok pada batas segmen: "/admin" cocok dengan "/admin/users", bukan "/administrator". */
function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => matches(pathname, route));
}

export function requiredTierFor(pathname: string): Tier {
  let best: { prefix: string; min: Tier } | null = null;
  for (const rule of ROUTE_RULES) {
    if (matches(pathname, rule.prefix) && (!best || rule.prefix.length > best.prefix.length)) {
      best = rule;
    }
  }
  return best?.min ?? "free";
}

/** Tujuan redirect saat tier tidak cukup. Admin → 403, lainnya → halaman upgrade. */
export function deniedRedirect(required: Tier, from?: string): string {
  if (required === "admin") return "/forbidden";
  const params = new URLSearchParams({ required });
  if (from) params.set("from", from);
  return `/upgrade?${params.toString()}`;
}

/**
 * Validasi tujuan redirect setelah login (cegah open redirect).
 * Hanya path relatif internal yang diterima.
 */
export function safeNext(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return fallback;
  if (isPublicRoute(value.split("?")[0])) return fallback;
  return value;
}
