# Lumen Invest

Dashboard portofolio dan riset pasar dengan proteksi paket (Free, Premium, Admin). Dibangun dengan Next.js 15, TypeScript, Tailwind CSS v4, dan Neon.

## Mulai cepat

```bash
npm install
cp .env.example .env.local   # isi DATABASE_URL, AUTH_SECRET, CRON_SECRET
npm run dev                  # http://localhost:3000
npm run build                # build produksi
npm run typecheck            # pemeriksaan tipe
npm run docs                 # membuat ulang docs/PANDUAN-PENGGUNA.md
```

Jalankan `db/001_journal.sql` lalu `db/002_meme_market.sql` sekali di Neon, berurutan.

## Dokumentasi

`docs/PANDUAN-PENGGUNA.md` berisi panduan untuk pengguna akhir, dari mencatat transaksi sampai membaca Futures Sentiment. Isinya sama dengan halaman Bantuan di aplikasi.

`docs/DOKUMENTASI-TEKNIS.md` berisi arsitektur, aturan akses, modul pasar, jurnal, futures, berita, pengamanan, dan batasan yang diketahui.

## Halaman dan akses

| Route | Akses | Keterangan |
|---|---|---|
| `/login` | Publik | Masuk ke akun |
| `/dashboard` | Free | Ringkasan dan watchlist (3 saham Free, 5 saham Premium) |
| `/portfolio` | Free | Posisi dan alokasi. Ekspor CSV khusus Premium |
| `/journal` | Free | Jurnal saham IDX, saham US, crypto, dan meme coin. Free sampai 30 transaksi |
| `/calendar` | Free | Kalender untung rugi. Free 3 bulan terakhir |
| `/analysis` | Premium | Risiko, kinerja, dan alokasi |
| `/futures` | Premium | Futures Sentiment: funding rate, open interest, long short ratio, dan konfluensi teknikal |
| `/market` | Premium | Pasar saham, crypto, dan meme coin |
| `/news` | Premium | Berita pasar dikelompokkan menurut narasi |
| `/support` | Free | Bantuan, panduan, istilah, dan referensi |
| `/upgrade` | Free | Perbandingan paket |
| `/admin` | Admin | Ringkasan sistem dan pengguna |

## Struktur singkat

`app/[tab]` berisi layar, `app/api` berisi route handler, `lib` berisi logika, `lib/news` dan `lib/futures` berisi modul berita dan futures, `lib/help` berisi isi Bantuan, dan `db` berisi migrasi SQL. Detail lengkapnya ada di `docs/DOKUMENTASI-TEKNIS.md`.
