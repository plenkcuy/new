import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { requireFeature } from "@/lib/auth/guards";
import { getAnalytics } from "@/lib/data/analytics";
import { decimal, idr, pct } from "@/lib/format";

export default async function AnalysisPage() {
  // Guard server: pengguna Free dialihkan ke /upgrade sebelum data apa pun dihitung.
  await requireFeature("advanced-analytics", "/analysis");
  const a = await getAnalytics();

  return (
    <>
      <PageHeader title="Analisis" subtitle="Risiko, kinerja, dan alokasi portofoliomu" />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Return 1 tahun"
          value={pct(a.annualReturn)}
          tone={a.annualReturn >= 0 ? "up" : "down"}
        />
        <StatCard label="Volatilitas tahunan" value={`${decimal(a.volatility)}%`} hint="Simpangan baku return mingguan" />
        <StatCard label="Rasio Sharpe" value={decimal(a.sharpe)} hint="Acuan bebas risiko 6%" />
        <StatCard label="Penurunan maksimum" value={`${decimal(a.maxDrawdown)}%`} tone="down" hint="Dari puncak ke lembah" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-lg">Alokasi per sektor</h2>
          <ul className="mt-5 flex flex-col gap-4">
            {a.sectors.map((s) => (
              <li key={s.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{s.label}</span>
                  <span className="text-[var(--muted)]">
                    {decimal(s.share, 1)}% · {idr(s.value)}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${s.share}%`, background: "linear-gradient(90deg,#14b8a6,#5eead4)" }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card overflow-x-auto">
          <h2 className="p-6 pb-2 text-lg">Kontributor untung/rugi</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Saham</th>
                <th className="num">Untung/rugi</th>
                <th className="num">%</th>
              </tr>
            </thead>
            <tbody>
              {a.contributors.map((c) => (
                <tr key={c.symbol}>
                  <td>
                    <div>{c.symbol}</div>
                    <div className="text-[11px] text-[var(--muted)]">{c.name}</div>
                  </td>
                  <td className={`num ${c.pnl >= 0 ? "up" : "down"}`}>{idr(c.pnl)}</td>
                  <td className={`num ${c.pnlPct >= 0 ? "up" : "down"}`}>{pct(c.pnlPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <p className="text-xs text-[var(--muted)]">
        Dihitung dari data tiruan untuk demo UI. Bukan saran investasi.
      </p>
    </>
  );
}
