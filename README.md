# Lumen Invest — Dashboard

Dashboard portofolio investasi dengan **proteksi tier (Free / Premium / Admin)**.
Stack: **Next.js 15 (App Router) · TypeScript · Tailwind v4 · Recharts**. Data masih tiruan.

## Jalankan

```bash
npm install
cp .env.example .env.local   # isi AUTH_SECRET (opsional di development)
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
| `/journal` | Free | Jurnal transaksi saham IDX, saham US, crypto, meme coin. Free dibatasi 30 transaksi, analitik dan ekspor CSV khusus Premium |
| `/market` | Free | Indeks & saham. Feed tertunda (Free) / real-time (Premium) |
| `/analysis` | **Premium** | Risiko, sektor, kontributor |
| `/community` | **Premium** | Diskusi investor |
| `/settings`, `/support`, `/upgrade` | Free | Akun, FAQ, perbandingan paket |
| `/admin` | **Admin** | Ringkasan sistem + daftar pengguna |
| `GET /api/export` | Premium | CSV portofolio |
| `GET /api/journal/export` | Premium | CSV jurnal transaksi |
| `GET /api/cron/prices` | `CRON_SECRET` | Pembaruan harga dan kurs harian (dipanggil Vercel Cron) |

Admin otomatis mencakup hak Premium (`free < premium < admin`).

## Struktur (31 file, 7 folder)

```
middleware.ts               Lapisan 1: penjaga di edge
app/
  login/page.tsx            Halaman login
  api/export/route.ts       CSV portofolio (Premium)
  [tab]/                    SEMUA menu sidebar (satu route dinamis)
    page.tsx                Router: daftar SCREENS + guard tier terpusat
    layout.tsx  shell.tsx   Layout + sidebar/menu pengguna (client)
    error.tsx
    dashboard.tsx  dashboard-widgets.tsx   Dashboard + watchlist/grafik (client)
    portfolio.tsx  market.tsx
    premium.tsx             Analisis + Komunitas
    account.tsx             Pengaturan, Bantuan, Upgrade, Akses ditolak
    admin.tsx
components/ui.tsx           Komponen kecil dipakai banyak layar
lib/
  shared.ts                 Tipe domain + format Rupiah/persen/tanggal
  access.ts                 Tier + ATURAN RUTE + fitur/batas paket   [edge-safe]
  session.ts                Config + token sesi HMAC (Web Crypto)    [edge-safe]
  auth.ts                   Repo pengguna, cookie sesi, guard server [server-only]
  actions.ts                Server action: login & logout
  data.ts                   Semua data tiruan                        [server-only]
```

## Upload manual ke GitHub

1. Ekstrak zip, lalu buka folder hasil ekstrak (jangan upload file `.zip`-nya, GitHub tidak mengekstraknya).
2. Di repo: *Add file → Upload files*, lalu **drag seluruh isi folder** (folder `app`, `components`, `lib` dan file di root) sekaligus. Folder ikut terbawa beserta isinya.
3. Pastikan `.gitignore` dan `.env.example` ikut (file berawalan titik kadang tersembunyi di Explorer/Finder; aktifkan "show hidden files").
4. Folder bernama `[tab]` memang begitu namanya, jangan diubah.
5. Jangan upload `.env.local` atau `node_modules`. Isi `AUTH_SECRET` di Vercel, bukan di repo.

## Model proteksi (defense in depth)

1. **Middleware**: belum login → `/login?next=…`; tier kurang → `/upgrade` atau `/forbidden`; API → 401/403 JSON. Cepat tapi hanya membaca tier dari cookie.
2. **Guard server di `app/[tab]/page.tsx`** (`requireTier`, tier minimum dari `ROUTE_RULES`): lapisan **otoritatif**. Tier dibaca ulang dari repository, akun yang dibekukan langsung ditolak. Layout tidak dirender ulang saat pindah tab, jadi guard ada di page, bukan di layout.
3. **Guard di API** (`authorizeApi`): route handler tidak boleh mengandalkan UI.
4. **Pembatasan data di server**: konten premium tidak dirender untuk Free (diganti `UpgradeCard`), watchlist dipotong sesuai jatah, rentang grafik di luar jatah dikembalikan ke bawaan. Data tidak pernah dikirim lalu disembunyikan di browser.
5. **UI** (ikon gembok di sidebar, tombol terkunci) hanya kenyamanan, bukan keamanan.

Sesi = cookie `httpOnly`, `sameSite=lax`, `secure` di production, ditandatangani HMAC, kedaluwarsa 8 jam.

> Next.js < 15.2.3 punya celah bypass middleware (CVE-2025-29927). `package.json` mengunci `^15.5.0`. Tetap pertahankan guard di server.

> Hati-hati di `lib/actions.ts`: setiap fungsi yang diekspor dari file `"use server"` menjadi endpoint publik. Jangan taruh guard/helper di sana.

## Environment

| Variabel | Wajib | Keterangan |
|---|---|---|
| `AUTH_SECRET` | production | Minimal 32 karakter acak (`openssl rand -base64 48`). Tanpa ini sesi ditolak. |
| `DATABASE_URL` | fitur Jurnal | Connection string Neon. Jalankan `db/001_journal.sql` sekali di Neon. |
| `CRON_SECRET` | production | Minimal 16 karakter acak untuk `/api/cron/prices`. Vercel mengirimnya otomatis. |
| `DEMO_AUTH` | — | `true` mengaktifkan login demo. Development: aktif otomatis. **Production: mati kecuali `true`.** |

⚠️ Login demo membiarkan siapa pun memilih akun Admin. Pakai hanya untuk demo/pratinjau, bukan untuk pengguna nyata.

## Deploy ke Vercel

1. Push ke GitHub → Vercel → *Add New → Project* → pilih repo (Next.js terdeteksi otomatis).
2. Settings → Environment Variables: isi `AUTH_SECRET`, dan `DEMO_AUTH=true` bila ingin demo online.
3. Deploy.

## Cara menambah tab baru

1. Tulis layar `export async function LaporanScreen({ user, query }: ScreenProps)` di salah satu file `app/[tab]/` (atau file baru).
2. Daftarkan di `SCREENS` dalam `app/[tab]/page.tsx`: `laporan: { title: "Laporan", render: LaporanScreen }`.
3. Butuh Premium/Admin? Tambahkan `{ prefix: "/laporan", min: "premium" }` ke `ROUTE_RULES` di `lib/access.ts`. Middleware, sidebar, dan guard otomatis ikut.
4. Tambahkan menu di `NAV_MAIN` pada `app/[tab]/shell.tsx`.
5. Fitur baru? tambahkan ke `FEATURE_MIN_TIER` di `lib/access.ts`.

## Mengganti login demo dengan login sungguhan

1. Ganti isi `userRepo` di `lib/auth.ts` dengan query database (Prisma/Drizzle/Supabase).
2. Ganti `loginDemo` di `lib/actions.ts` dengan verifikasi kredensial (hash password, mis. argon2/bcrypt) atau OAuth/penyedia auth (Auth.js, Clerk, Supabase Auth). Setelah berhasil, panggil `createSession(user)`.
3. Saat tier berubah (upgrade/downgrade), panggil `createSession(user)` lagi supaya cookie ikut diperbarui. Guard server sudah memakai tier terbaru dari repository.
4. Tambahkan rate limiting & proteksi brute force pada endpoint login.

## Jurnal transaksi

Catatan transaksi disimpan di Neon (`db/001_journal.sql`: aset, transaksi, harga harian, kurs).

- Mata uang: tiap transaksi memakai mata uang aset (IDR untuk IDX, USD untuk lainnya, USDT dianggap 1 USD). Laporan bisa IDR atau USD. Modal memakai kurs saat transaksi, nilai pasar memakai kurs hari itu, jadi pengaruh kurs terbaca terpisah.
- Rumus ada di `lib/journal-calc.ts`: harga rata rata bergerak, untung rugi terealisasi dan belum, TWR, drawdown, win rate, profit factor, expectancy, kelipatan R.
- Harga: Yahoo Finance (IDX, US, crypto besar) dan DexScreener (meme coin, lewat alamat kontrak), diperbarui harian oleh cron di `vercel.json`. Bila data pasar belum ada, jurnal memakai harga transaksi terakhir dan menandainya.
- Fee bawaan per jenis aset ada di `FEE_DEFAULTS` (`lib/journal-input.ts`), isi kolom fee untuk angka sebenarnya dari brokermu.
- Batas paket: `journalTrades` dan fitur `journal-analytics` di `lib/access.ts`.

## Catatan

- Seluruh data (harga, portofolio, komunitas, admin) adalah **data tiruan** di `lib/data.ts`.
- Panel admin masih hanya-baca; aksi ubah paket/bekukan akun belum ada.
- Pembayaran belum terhubung; halaman `/upgrade` mengarahkan ke kontak.
