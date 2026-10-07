# Lumen Invest — Dashboard UI

Dashboard portofolio investasi (UI saja, data tiruan). Dibangun dengan **Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Recharts**.

## Jalankan lokal

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # cek build produksi
```

## Deploy ke Vercel

**Lewat GitHub (disarankan)**
1. Push folder ini ke repo GitHub.
2. Di vercel.com → *Add New → Project* → pilih repo.
3. Framework terdeteksi otomatis (Next.js). Klik *Deploy*. Tidak perlu environment variable.

**Lewat CLI**
```bash
npm i -g vercel
vercel        # preview
vercel --prod # produksi
```

## Struktur

```
app/            layout, halaman utama, gaya global (warna tosca ada di :root)
components/     AppShell (layout + drawer menu), Sidebar, Header, TopTabs,
                TotalHolding, AiInsights, Watchlist, Portfolio, PerformanceChart
lib/data.ts     data tiruan (deterministik) — ganti dengan API nyata nanti
lib/format.ts   format Rupiah, persen, angka
```

## Langkah berikutnya

- Ganti `lib/data.ts` dengan pemanggilan API (route handler Next.js atau backend terpisah).
- Tambahkan autentikasi dan halaman Portofolio / Analisis / Pasar.
- Tambahkan state loading, empty, dan error untuk tiap kartu.
