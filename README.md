# Lumen Invest — Dashboard

Dashboard portofolio investasi dengan **proteksi tier (Free / Premium / Admin)**.
Stack: **Next.js 15 (App Router) · TypeScript · Tailwind v4 · Recharts**. Data masih tiruan.

## Jalankan

```bash
npm install
cp .env.example .env.local   # lalu isi AUTH_SECRET (opsional di development)
npm run dev                  # http://localhost:3000
npm run build                # cek build produksi
npm run typecheck
```

Buka `/login`, pilih akun demo **Free**, **Premium**, atau **Admin**.

## Halaman (satu menu sidebar = satu route)

| Route | Akses | Keterangan |
|---|---|---|
| `/login` | publik | Login demo |
| `/dashboard` | Free | Ringkasan. Insight AI, rentang grafik 6M/1Y, dan watchlist penuh terkunci untuk Free |
| `/portfolio` | Free | Posisi & alokasi. Ekspor CSV khusus Premium |
| `/market` | Free | Indeks & saham. Feed tertunda (Free) / real-time (Premium) |
| `/analysis` | **Premium** | Risiko, sektor, kontributor |
| `/community` | **Premium** | Diskusi investor |
| `/settings`, `/support`, `/upgrade` | Free | Akun, FAQ, perbandingan paket |
| `/admin`, `/admin/users` | **Admin** | Ringkasan sistem & daftar pengguna |
| `GET /api/portfolio/export` | Premium | CSV portofolio |
| `GET /api/admin/users` | Admin | JSON pengguna |

Admin otomatis mencakup hak Premium (`free < premium < admin`).

## Struktur

```
middleware.ts                 Lapisan 1: penjaga di edge
app/
  (auth)/login/               Halaman login
  (app)/                      Semua halaman yang butuh login (layout = sidebar)
    dashboard/ portfolio/ analysis/ market/ community/
    settings/ support/ upgrade/ forbidden/
    admin/ (page + users/)
  api/admin/users/            API contoh (Admin)
  api/portfolio/export/       API contoh (Premium)
components/
  layout/                     AppShell, Sidebar, UserMenu, nav-config
  dashboard/                  Kartu & grafik dashboard
  ui/                         PageHeader, StatCard, TierBadge, UpgradeCard, SymbolDot
lib/
  auth/
    types.ts                  Tier, User, SessionUser
    tiers.ts                  Urutan tier + hasTier()
    access.ts                 ATURAN RUTE (satu sumber kebenaran), safeNext()
    token.ts                  Cookie sesi HMAC-SHA256 (Web Crypto, tanpa dependensi)
    config.ts                 Cookie, AUTH_SECRET, DEMO_AUTH
    users.ts                  Repository pengguna (server-only) ← ganti dengan DB
    session.ts                createSession / getSession (server-only)
    guards.ts                 requireSession / requireTier / requireFeature / authorizeApi
    actions.ts                Server actions login & logout
  plans.ts                    Fitur per tier, batas (limit), tabel perbandingan paket
  data/                       Data tiruan server-only (ganti dengan API/DB)
```

## Model proteksi (defense in depth)

1. **Middleware** (`middleware.ts`): belum login → `/login?next=…`; tier kurang → `/upgrade` atau `/forbidden`; API → 401/403 JSON. Cepat tapi hanya membaca tier dari cookie.
2. **Guard server di setiap page** (`requireSession` / `requireTier` / `requireFeature`): ini lapisan **otoritatif**. Tier dibaca ulang dari repository, akun yang dibekukan langsung ditolak. Layout tidak dirender ulang saat pindah halaman, jadi guard harus ada di tiap page, bukan hanya di layout.
3. **Guard di API & server action** (`authorizeApi`): route handler tidak boleh mengandalkan UI.
4. **Pembatasan data di server**: konten premium tidak dirender untuk Free (diganti `UpgradeCard`), watchlist dipotong sesuai jatah, dan rentang grafik di luar jatah dikembalikan ke bawaan. Data tidak pernah dikirim lalu disembunyikan di browser.
5. **UI** (ikon gembok di sidebar, tombol terkunci) hanya kenyamanan, bukan keamanan.

Sesi = cookie `httpOnly`, `sameSite=lax`, `secure` di production, ditandatangani HMAC dan kedaluwarsa 8 jam.

> Kebijakan: Next.js < 15.2.3 punya celah bypass middleware (CVE-2025-29927). `package.json` mengunci `^15.5.0`. Tetap pertahankan guard di server.

## Environment

| Variabel | Wajib | Keterangan |
|---|---|---|
| `AUTH_SECRET` | production | Minimal 32 karakter acak (`openssl rand -base64 48`). Tanpa ini sesi ditolak. |
| `DEMO_AUTH` | — | `true` mengaktifkan login demo. Development: aktif otomatis. **Production: mati kecuali `true`.** |

⚠️ Login demo membiarkan siapa pun memilih akun Admin. Pakai hanya untuk demo/pratinjau, bukan untuk pengguna nyata.

## Deploy ke Vercel

1. Push ke GitHub → Vercel → *Add New → Project* → pilih repo (Next.js terdeteksi otomatis).
2. Settings → Environment Variables: isi `AUTH_SECRET`, dan `DEMO_AUTH=true` bila ingin demo online.
3. Deploy.

## Cara menambah halaman terproteksi

1. Buat `app/(app)/laporan/page.tsx`.
2. Daftarkan di `lib/auth/access.ts` → `ROUTE_RULES`: `{ prefix: "/laporan", min: "premium" }`.
3. Di page, panggil guard paling atas: `await requireTier("premium", "/laporan")` (atau `requireFeature("nama-fitur")`).
4. Tambahkan ke `components/layout/nav-config.ts`. Ikon gembok muncul otomatis.
5. Fitur baru? tambahkan ke `FEATURE_MIN_TIER` di `lib/plans.ts`.

## Mengganti login demo dengan login sungguhan

1. Implementasikan `UserRepository` di `lib/auth/users.ts` dengan database (Prisma/Drizzle/Supabase).
2. Ganti `loginDemo` di `lib/auth/actions.ts` dengan verifikasi kredensial (hash password, mis. argon2/bcrypt) atau OAuth/penyedia auth (Auth.js, Clerk, Supabase Auth). Setelah berhasil, panggil `createSession(user)`.
3. Saat tier berubah (upgrade/downgrade), panggil `createSession(user)` lagi supaya cookie ikut diperbarui. Guard server sudah memakai tier terbaru dari repository.
4. Tambahkan rate limiting & proteksi brute force pada endpoint login.

## Catatan

- Seluruh data (harga, portofolio, komunitas, admin) adalah **data tiruan**.
- Panel admin masih hanya-baca; aksi ubah paket/bekukan akun belum ada.
- Pembayaran belum terhubung; halaman `/upgrade` mengarahkan ke kontak.
