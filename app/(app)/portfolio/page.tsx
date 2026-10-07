import Link from "next/link";
import { Download, Lock } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { SymbolDot } from "@/components/ui/SymbolDot";
import { deniedRedirect } from "@/lib/auth/access";
import { requireSession } from "@/lib/auth/guards";
import { getHoldings, getPortfolioSummary } from "@/lib/data/market";
import { can } from "@/lib/plans";
import { idr, num, pct } from "@/lib/format";

export default async function PortfolioPage() {
  const { user } = await requireSession();
  const [holdings, summary] = await Promise.all([getHoldings(), getPortfolioSummary()]);

  return (
    <>
      <PageHeader title="Portofolio" subtitle="Seluruh posisi dan alokasi asetmu">
        {can(user.tier, "export-csv") ? (
          // Endpoint /api/portfolio/export memeriksa tier lagi di server.
          <a href="/api/portfolio/export" download className="btn btn-ghost">
            <Download size={16} /> Ekspor CSV
          </a>
        ) : (
          <Link href={deniedRedirect("premium", "/portfolio")} className="btn btn-ghost">
            <Lock size={16} /> Ekspor CSV (Premium)
          </Link>
        )}
      </PageHeader>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total aset" value={idr(summary.total)} />
        <StatCard label="Nilai saham" value={idr(summary.stocksValue)} hint={`Modal ${idr(summary.cost)}`} />
        <StatCard label="Kas" value={idr(summary.cash)} />
        <StatCard
          label="Untung/rugi belum terealisasi"
          value={idr(summary.pnl)}
          hint={pct(summary.pnlPct)}
          tone={summary.pnl >= 0 ? "up" : "down"}
        />
      </div>

      <section className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Saham</th>
              <th className="num">Lembar</th>
              <th className="num">Harga rata-rata</th>
              <th className="num">Harga</th>
              <th className="num">Nilai</th>
              <th className="num">Untung/rugi</th>
              <th className="num">Alokasi</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const value = h.units * h.price;
              const plPct = (h.price / h.avgPrice - 1) * 100;
              return (
                <tr key={h.symbol}>
                  <td>
                    <div className="flex items-center gap-3">
                      <SymbolDot symbol={h.symbol} color={h.color} size={32} />
                      <div>
                        <div>{h.symbol}</div>
                        <div className="text-[11px] text-[var(--muted)]">{h.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="num">{num(h.units)}</td>
                  <td className="num">{num(h.avgPrice)}</td>
                  <td className="num">{num(h.price)}</td>
                  <td className="num">{idr(value)}</td>
                  <td className={`num ${plPct >= 0 ? "up" : "down"}`}>{pct(plPct)}</td>
                  <td className="num">{((value / summary.total) * 100).toFixed(1).replace(".", ",")}%</td>
                </tr>
              );
            })}
            <tr>
              <td>Kas</td>
              <td className="num">—</td>
              <td className="num">—</td>
              <td className="num">—</td>
              <td className="num">{idr(summary.cash)}</td>
              <td className="num">—</td>
              <td className="num">{((summary.cash / summary.total) * 100).toFixed(1).replace(".", ",")}%</td>
            </tr>
          </tbody>
        </table>
      </section>

      <p className="text-xs text-[var(--muted)]">Data tiruan untuk demo UI.</p>
    </>
  );
}
