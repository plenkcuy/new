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
| `/settings`, `/support`, `/upgrade` | Free | Akun, FAQ, perbandingan paket |
| `/futures` | **Premium** | Futures Sentiment: funding rate, open interest, long short ratio, dan konfluensi teknikal harian (BTC, ETH, SOL) |
| `/admin` | **Admin** | Ringkasan sistem + daftar pengguna |
| `POST /api/futures/snapshot` | Premium | Simpan bias terakhir milik pengguna (maks tiap 30 menit) untuk kartu Insight AI |
| `GET /api/export` | Premium | CSV portofolio |
| `GET /api/journal/export` | Premium | CSV jurnal transaksi |
| `GET /api/prices` | Login | Harga terkini posisi terbuka milik pengguna (Free tiap 60 detik, Premium tiap 10 detik) |
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
    premium.tsx             Analisis
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
| `DATABASE_URL` | fitur Jurnal | Connection string Neon. Jalankan `db/001_journal.sql` sekali di Neon. Untuk Futures Sentiment, jalankan juga `db/002_futures.sql`. |
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

## Standar UI dan aksesibilitas

Mengacu pada WCAG 2.2 AA, WAI-ARIA Authoring Practices (landmark dan navigasi), pedoman navigasi Material Design 3, dan praktik dashboard dari Nielsen Norman Group.

- Landmark: skip link "Lewati ke konten utama", `header`, dua `nav` berlabel (utama, serta pengaturan dan bantuan), dan satu `main`. Menu aktif memakai `aria-current="page"`.
- Sidebar 250px di desktop, dikelompokkan per tujuan (Aset Saya, Riset Pasar, Pengelola). Di layar kecil jadi drawer modal: fokus pindah ke tombol tutup, Tab berputar di dalam drawer, Esc menutup dan mengembalikan fokus, konten utama `inert` selama drawer terbuka.
- Fokus keyboard selalu terlihat (`:focus-visible`, garis 2px, kontras di atas 3:1). Target sentuh minimal 36px, teks minimal 12px.
- Kontras: teks utama dan sekunder di atas 8:1, tombol dan menu aktif 5:1 ke atas.
- `prefers-reduced-motion` dihormati. Perpindahan halaman menampilkan skeleton (`app/[tab]/loading.tsx`), bukan layar kosong.
- Angka memakai `tabular-nums` agar kolom rata.

## Futures Sentiment: pencarian, cache, dan keamanan

- Pencarian koin memakai daftar simbol Binance (Spot dan Futures, pasangan USDT) yang di-cache 6 jam. Data harga dan candle diambil dari Binance Spot lebih dulu; kalau koinnya tidak ada di Spot, dipakai Binance Futures. Funding, OI, dan long short ratio selalu dari Futures dan hanya muncul kalau koin punya kontrak futures.
- Chart TradingView mengikuti exchange kartu (`BINANCE:BTCUSDT` untuk Spot, `BINANCE:BTCUSDT.P` untuk Futures) dan baru dimuat saat tombol Tampilkan chart ditekan.
- Cache di browser (`lib/futures/cache.ts`): memori plus localStorage, TTL 45 detik untuk harga dan derivatif, 10 menit untuk candle, 6 jam untuk daftar koin. Permintaan kembar digabung, dan kalau Binance gagal dipakai data cache terakhir.
- Keamanan, mengikuti OWASP Input Validation Cheat Sheet, HTML5 Security Cheat Sheet, panduan CSP Next.js, dokumentasi embed TradingView, dan dokumentasi REST API Binance:
  - Input pencarian dinormalisasi lalu dicocokkan dengan allowlist `^[A-Z0-9]{1,15}USDT$`; hanya simbol yang ada di daftar Binance yang dikirim ke API. Aturan yang sama dipakai ulang di server untuk snapshot.
  - Data dari localStorage tidak dipercaya: divalidasi bentuknya saat dibaca, ditolak kalau rusak atau lebih tua dari 24 jam. Yang disimpan hanya data pasar publik dan daftar koin, tanpa token atau data akun.
  - Tidak ada `innerHTML` atau `dangerouslySetInnerHTML`; semua teks lewat React.
  - TradingView dimuat di iframe `sandbox` (tanpa `allow-same-origin`), jadi skripnya tidak bisa menyentuh halaman atau cookie Lumen. Konfigurasinya di-escape sebelum masuk ke dokumen iframe.
  - Panggilan ke Binance memakai `credentials: omit`, tanpa referrer, host data publik `data-api.binance.vision` untuk Spot, dan berhenti sementara kalau menerima 429 atau 418.
  - Header CSP produksi (`next.config.ts`): `object-src 'none'`, `base-uri`, `form-action`, `frame-ancestors 'none'`, `frame-src` dan `connect-src` dibatasi ke TradingView dan Binance. `script-src` belum dibatasi karena butuh nonce di semua halaman.
  - Endpoint snapshot butuh login Premium, menolak isi lebih dari 4 KB, dan hanya menyimpan simbol dan bias yang lolos validasi.

## Jurnal transaksi

Catatan transaksi disimpan di Neon (`db/001_journal.sql`: aset, transaksi, harga harian, kurs).

- Mata uang: tiap transaksi memakai mata uang aset (IDR untuk IDX, USD untuk lainnya, USDT dianggap 1 USD). Laporan bisa IDR atau USD. Modal memakai kurs saat transaksi, nilai pasar memakai kurs hari itu, jadi pengaruh kurs terbaca terpisah.
- Rumus ada di `lib/journal-calc.ts`: harga rata rata bergerak, untung rugi terealisasi dan belum, TWR, drawdown, win rate, profit factor, expectancy, kelipatan R.
- Harga: Yahoo Finance (IDX, US, crypto besar) dan DexScreener (meme coin, lewat alamat kontrak), diperbarui harian oleh cron di `vercel.json`. Bila data pasar belum ada, jurnal memakai harga transaksi terakhir dan menandainya.
- Portofolio (`/portfolio`) dihitung dari jurnal dan dinilai dengan harga terkini: Binance (crypto), Pluang (saham IDX), Reku (saham US), DexScreener (meme coin). Premium mendapat WebSocket Binance langsung di browser, Free memakai polling 60 detik. Scraper ada di `lib/scrapers/` dan bergantung pada struktur `__NEXT_DATA__` situs sumber, jadi cek bila harga berhenti muncul.
- Watchlist dan Pasar memakai daftar hasil scraper yang disimpan di Neon (`market_lists`): Pluang Explore (saham IDX dan US) dan CoinMarketCap (crypto), kode di `lib/scrapers/` dan `lib/market-lists.ts`. Data dibaca dari database. Bila lebih tua dari 15 menit (Free) atau 5 menit (Premium), data lama tetap tampil dan pembaruan jalan di belakang. Cron harian ikut memanaskan semua daftar. Pengambilan halaman memakai axios + cheerio (timeout 20 detik) seperti scraper aslinya. Bila diblokir atau datanya baru muncul lewat JavaScript, otomatis dicoba ulang lewat Puppeteer (Vercel: `@sparticuz/chromium` + `puppeteer-core`). Matikan dengan `SCRAPER_PUPPETEER=0`. Lokal, isi `PUPPETEER_EXECUTABLE_PATH` ke Chrome kamu. Bila watchlist kosong, panggil `GET /api/cron/prices` dengan header `Authorization: Bearer <CRON_SECRET>` dan lihat `marketLists.details`: tiap daftar menampilkan `via` (axios atau puppeteer) atau alasan gagalnya. Dashboard, Portofolio, dan Analisis dihitung dari jurnal. Hanya Admin yang masih data tiruan.
- Close di Jurnal: toggle "Tandai close" (saat Beli) mencatat entry dan close sekaligus sebagai dua baris tertaut (`link_id`), dan tombol "Tutup" di tabel posisi mengisi form untuk menjual posisi itu. PnL bisa otomatis (pratinjau memakai rumus mesin hitung) atau manual (`pnl_manual`, mata uang aset, bersih dari fee dan pajak). PnL manual hanya mengganti angka untung rugi, sisa posisi tetap dihitung dari harga rata rata dan efek kurs dianggap nol. Stop loss dan take profit nonaktif dan diabaikan server pada transaksi jual dan close. Menutup posisi tidak dihitung ke batas transaksi Free, sedangkan close langsung memakai 2 slot. Menghapus salah satu sisi pasangan menghapus keduanya.
- Short dan R: setiap transaksi punya `direction` (long dibuka dengan beli, short dibuka dengan jual dan ditutup dengan beli). Long dan short pada aset yang sama dihitung terpisah, tanpa netting. Rumus short mencerminkan long (PnL = hasil jual bersih dikurangi biaya beli kembali, efek kurs dan PnL manual ikut). Nilai posisi short adalah untung rugi belum terealisasi tanpa margin, bunga, atau funding, jadi short tidak ikut alokasi dan tidak menambah modal. Isian "Stop awal" khusus menghitung R pada transaksi yang menutup posisi (long: di bawah entry, short: di atas). Stop loss dan take profit saat membuka posisi divalidasi sisinya.
- Tampilan HP: angka besar di kartu dan sel kalender memakai `components/fit-text.tsx` (mengecil otomatis sampai muat, angka rupiah di atas 10 miliar diringkas lewat `moneyFit`). Tabel data memakai class `stack`, `stack-lg`, atau `stack-xl` (lihat komentar di `app/globals.css`) dan atribut `data-label` pada sel, sehingga di layar kecil tiap baris menjadi kartu dan tidak perlu digeser ke samping. Tabel baru tinggal diberi class dan `data-label` yang sama.
- Fee bawaan per jenis aset ada di `FEE_DEFAULTS` (`lib/journal-input.ts`), isi kolom fee untuk angka sebenarnya dari brokermu.
- Batas paket: `journalTrades` dan fitur `journal-analytics` di `lib/access.ts`.

## Catatan

- Seluruh data (harga, portofolio, admin) adalah **data tiruan** di `lib/data.ts`.
- Panel admin masih hanya-baca; aksi ubah paket/bekukan akun belum ada.
- Pembayaran belum terhubung; halaman `/upgrade` mengarahkan ke kontak.
