import { NextResponse, type NextRequest } from "next/server";
import { deniedRedirect, hasTier, isPublicRoute, requiredTierFor } from "@/lib/access";
import { SESSION_COOKIE, verifyToken } from "@/lib/session";

/**
 * LAPISAN 1, penjaga di edge (cepat, kasar).
 * - Belum login        → /login?next=… (API: 401 JSON)
 * - Tier tidak cukup   → /upgrade atau /forbidden (API: 403 JSON)
 *
 * Tier di sini dibaca dari cookie, bisa tertinggal jika tier berubah di tengah
 * sesi. Karena itu setiap halaman TETAP memanggil guard server (lib/auth.ts)
 * yang membaca tier terbaru. Middleware bukan satu-satunya pagar.
 *
 * Sengaja TIDAK mengalihkan pengguna yang sudah login dari /login: halaman login
 * yang memutuskan (memakai sesi otoritatif), supaya tidak ada redirect loop.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicRoute(pathname)) return NextResponse.next();

  const isApi = pathname.startsWith("/api/");
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session) {
    if (isApi) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const required = requiredTierFor(pathname);
  if (!hasTier(session.tier, required)) {
    if (isApi) return NextResponse.json({ error: "forbidden", required }, { status: 403 });
    return NextResponse.redirect(new URL(deniedRedirect(required, pathname), request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Semua rute kecuali aset statis dan file ber-ekstensi.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
