# Dokumentasi Teknis Lumen Invest

Dokumen ini untuk pengembang dan pengelola. Untuk panduan pengguna akhir, lihat `docs/PANDUAN-PENGGUNA.md`, atau halaman Bantuan di aplikasi.

## Ringkasan

Lumen Invest dibangun dengan Next.js 15 (App Router), TypeScript, Tailwind CSS v4, dan Neon (PostgreSQL). Data pasar berasal dari beberapa sumber publik, dan setiap sumber dijelaskan di bagian modul di bawah.

## Menjalankan proyek

Install dependensi, lalu jalankan perintah berikut:

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
npm run typecheck  # pemeriksaan tipe
npm run build      # build produksi, termasuk lint dan pemeriksaan tipe
npm run docs       # membuat ulang docs/PANDUAN-PENGGUNA.md dari lib/help/content.ts
```

## Variabel lingkungan

| Variabel | Wajib | Fungsi |
|---|---|---|
| `DATABASE_URL` | Ya, untuk jurnal, pasar, kalender, dan portofolio | Connection string Neon. Tanpa ini, halaman tersebut menampilkan pesan database belum terhubung. |
| `AUTH_SECRET` | Ya, di produksi | Rahasia sesi, minimal 32 karakter. Di produksi, sesi ditolak kalau kosong. |
| `CRON_SECRET` | Ya, untuk cron | Melindungi endpoint `/api/cron/prices`. |
| `DEMO_AUTH` | Tidak | Mengaktifkan login demo. Di produksi biarkan kosong, dan jangan pernah diisi `true` untuk pengguna nyata. |
| `PUPPETEER_EXECUTABLE_PATH`, `SCRAPER_BROWSER`, `SCRAPER_PUPPETEER` | Tidak | Mengatur browser untuk scraper yang membutuhkan rendering. |

Jangan commit `.env.local`. File `.env.example` sudah berisi placeholder, bukan nilai rahasia.

## Database

Jalankan file SQL di folder `db/` secara berurutan sekali di Neon:

1. `db/001_journal.sql` membuat tabel jurnal, aset, transaksi, dan daftar pasar.
2. `db/002_meme_market.sql` menambahkan nilai `meme` ke constraint `market_lists`. Wajib dijalankan agar Pasar meme coin bisa menyimpan datanya.

## Struktur folder

`app/[tab]` berisi layar aplikasi. Semua menu lewat satu router, yaitu `app/[tab]/page.tsx`, dengan daftar layar di `SCREENS`. `app/api` berisi route handler, dan `app/login` berisi halaman login. `components` berisi komponen bersama. `lib` berisi logika bisnis, dan `lib/scrapers` berisi scraper data pasar. `lib/news` dan `lib/futures` berisi modul berita dan futures. `lib/help` berisi isi halaman Bantuan. `db` berisi migrasi SQL.

## Akses dan paket

Semua aturan akses ada di `lib/access.ts`, dan itu satu-satunya sumber kebenarannya. Middleware, sidebar, dan guard halaman memakai fungsi yang sama.

Tiga bagian yang perlu dipahami:

1. `ROUTE_RULES` menentukan tier minimum per awalan rute. Rute yang tidak terdaftar cukup login (Free). Saat ini `/analysis`, `/futures`, `/market`, dan `/news` butuh Premium, dan `/admin` butuh Admin.
2. `FEATURE_MIN_TIER` menentukan fitur yang dikunci di dalam halaman, misalnya ekspor CSV dan analitik jurnal.
3. `TIER_LIMITS` menentukan batas angka per paket: jumlah transaksi jurnal, watchlist, rentang grafik, dan riwayat kalender.

Tabel perbandingan paket di halaman Upgrade dibuat dari `getPlanComparison()` di file yang sama, jadi perubahan aturan otomatis ikut tampil.

Untuk menambah tab baru: buat fungsi layar (misalnya `XScreen`), daftarkan di `SCREENS` pada `app/[tab]/page.tsx`, lalu tambahkan aturan tier di `ROUTE_RULES` dan menu di `app/[tab]/shell.tsx`.

## Pasar: saham, crypto, dan meme coin

Daftar pasar disimpan di tabel `market_lists` dan dibaca lewat `lib/market-lists.ts`. Data diambil dari scraper di `lib/scrapers`: Pluang untuk saham IDX dan US, CoinMarketCap untuk crypto, dan DexScreener untuk meme coin lewat `lib/scrapers/dexscreener-boosts.ts`.

Penyegaran berjalan dua cara. Cron `/api/cron/prices` dijadwalkan sekali sehari lewat `vercel.json` (pukul 22.00 UTC). Halaman Pasar juga memicu penyegaran saat umur datanya melewati batas `MARKET_MAX_AGE_MS` di `lib/access.ts`, yaitu 5 menit untuk Premium dan 15 menit untuk paket tertunda.

## Jurnal dan pencarian aset

Pencarian kode aset ada di `lib/asset-search.ts`. Untuk saham dan crypto, hasil berasal dari riwayat pengguna, daftar pasar, dan katalog Binance Spot yang di-cache 6 jam. Untuk meme coin, pencarian memakai DexScreener lewat `lib/dexscreener.ts` dan menghasilkan chain serta alamat kontrak.

Route `/api/assets/quote` menerima kelas aset, kode, dan untuk meme coin juga chain dan alamat kontrak. Ketiganya divalidasi sebelum dipakai untuk memanggil DexScreener. Chain harus ada di allowlist, dan alamat harus cocok dengan pola EVM atau Solana.

## Futures Sentiment

Data futures diambil dari Binance (Spot dan Futures) lewat `lib/futures/feed.ts`. Analisis ada di `lib/futures/analyze.ts` dan `lib/futures/engine.ts`. Chart memakai widget TradingView lewat `lib/futures/tradingview.ts` dan ditampilkan di dalam iframe dengan sandbox. Pilihan koin dan ukuran kartu disimpan di localStorage browser, bukan di server.

## Berita

Modul berita ada di `lib/news`:

`sources.ts` berisi daftar kueri Google News RSS per pasar dan daftar feed publisher langsung. Semua URL ada di kode, tidak ada yang berasal dari input pengguna.

`feed.ts` mengambil dan mem-parse RSS atau Atom tanpa dependensi tambahan. Ada batas waktu 8 detik, batas ukuran 1,5 MB, dan hanya tautan dengan protokol http atau https yang diterima.

`narrative.ts` mengklasifikasikan judul dan ringkasan ke narasi berdasarkan kata kunci ID dan EN, lalu memberi bobot untuk urutan.

`load.ts` menggabungkan semua sumber, membuang duplikat judul, mengurutkan hasil, dan menyimpannya di cache 15 menit lewat `unstable_cache`. Kalau semua sumber gagal, fungsi melempar error supaya hasil kosong tidak ikut tersimpan.

Untuk menambah kata kunci narasi, edit array `NARRATIVES` di `lib/news/narrative.ts`. Untuk menambah sumber, edit `SEARCH_SOURCES` atau `DIRECT_FEEDS` di `lib/news/sources.ts`.

## Bantuan

Isi halaman Bantuan ada di `lib/help/content.ts`. Halaman ini dirender di `app/[tab]/support.tsx`, dan pencariannya ada di `app/[tab]/help-center.tsx`. File yang sama juga dipakai `scripts/build-docs.mjs` untuk membuat `docs/PANDUAN-PENGGUNA.md`, jadi aplikasi dan dokumen selalu sama.

## Keamanan

Pengamanan yang diterapkan mengikuti dokumentasi OWASP berikut:

Cheat sheet SSRF: [Server Side Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html). URL pengambilan data hanya dari kode, chain dan alamat divalidasi dengan allowlist dan regex sebelum masuk URL, parameter disusun dengan `URLSearchParams` atau `encodeURIComponent`, batas waktu dan ukuran dipasang, dan respons diperiksa bentuknya sebelum dipakai.

Cheat sheet XSS: [Cross Site Scripting Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html). Semua teks dari sumber luar dirender sebagai teks oleh React, tidak pernah lewat `dangerouslySetInnerHTML`. Tautan dari sumber luar hanya diterima kalau protokolnya http atau https, dan tautan keluar memakai `rel="noopener noreferrer nofollow"`.

Parameter `market`, `narasi`, dan kelas aset selalu dicocokkan ke daftar yang sudah ditentukan sebelum dipakai.

Rute yang tidak boleh diakses publik ada di `PUBLIC_ROUTES` dan `lib/access.ts`. Endpoint cron dilindungi `CRON_SECRET`.

## Batasan yang diketahui

Feed langsung dari media Indonesia belum ditambahkan, karena belum ada feed yang terverifikasi. Berita Indonesia saat ini datang dari Google News dengan operator `site:`.

Format Google News RSS tidak didokumentasikan secara resmi, jadi bisa berubah tanpa pemberitahuan. Kalau halaman Berita tiba-tiba kosong, periksa dulu format feed Google News.

Alamat email dukungan di `lib/help/content.ts` masih `support@lumen.example`. Ganti dengan alamat sungguhan sebelum produksi.
