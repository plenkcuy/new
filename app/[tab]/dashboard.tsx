import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader, SymbolDot, UpgradeCard } from "@/components/ui";
import { getHoldings, getPerformanceSeries, getPortfolioSummary, getWatchlist } from "@/lib/data";
import { can, limitsFor } from "@/lib/access";
import { compactIdr, idr, isRange, num, pct, type Holding, type ScreenProps } from "@/lib/shared";
import { PerformanceChart, Watchlist } from "./dashboard-widgets";

export async function DashboardScreen({ user, query }: ScreenProps) {
  const limits = limitsFor(user.tier);

  // Rentang diminta lewat URL, tapi SERVER yang memutuskan: di luar jatah tier → rentang bawaan.
  const requested = query.range;
  const range = isRange(requested) && limits.chartRanges.includes(requested) ? requested : limits.defaultRange;

  const [series, summary, watchlist, holdings] = await Promise.all([
    getPerformanceSeries(range),
    getPortfolioSummary(),
    getWatchlist(limits.watchlistItems),
    getHoldings(),
  ]);

  const first = series[0]?.value ?? summary.total;
  const change = ((summary.total - first) / first) * 100;
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={
          <>
            Selamat datang, <span className="text-[var(--accent)]">{firstName}</span>
          </>
        }
        subtitle="Ringkasan portofolio investasimu hari ini"
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-[1fr_1.05fr_1fr]">
        <div className="flex flex-col gap-5">
          <TotalHolding total={summary.total} change={change} rangeLabel={range} />
          {can(user.tier, "ai-insights") ? (
            <AiInsights />
          ) : (
            <UpgradeCard
              glow
              title="Insight AI"
              description="Rekomendasi dan ringkasan berbasis AI untuk portofoliomu tersedia di paket Premium."
              from="/dashboard"
              className="min-h-[230px]"
            />
          )}
        </div>

        <Watchlist items={watchlist.items} lockedCount={watchlist.lockedCount} />

        <div className="md:col-span-2 xl:col-span-1">
          <PortfolioCard holdings={holdings} />
        </div>
      </div>

      <PerformanceChart data={series} range={range} allowedRanges={limits.chartRanges} />
    </>
  );
}

/* ---------- Kartu khusus dashboard (server component) ---------- */

function TotalHolding({ total, change, rangeLabel }: { total: number; change: number; rangeLabel: string }) {
  return (
    <section className="card-glow flex flex-col justify-between p-6" style={{ minHeight: 160 }}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Total Aset</h2>
        <span className="pill">{rangeLabel}</span>
      </div>

      <div className="mt-6">
        <div className="text-3xl font-medium tracking-tight sm:text-[34px]">{idr(total)}</div>
        <div className={`mt-1 text-sm ${change >= 0 ? "up" : "down"}`}>
          {pct(change)} <span className="text-[var(--muted)]">dalam {rangeLabel}</span>
        </div>
      </div>
    </section>
  );
}

/** Hanya dirender untuk tier yang memiliki fitur "ai-insights". */
function AiInsights() {
  return (
    <section
      className="card-glow relative flex flex-col items-center justify-between px-6 pb-6 pt-7 text-center"
      style={{ minHeight: 230 }}
    >
      <div>
        <h2 className="text-xl">Keputusan Berbasis Data</h2>
        <p className="mx-auto mt-3 max-w-[300px] text-xs leading-relaxed text-[var(--muted)]">
          Tinggalkan tebak-tebakan. Dapatkan insight berbasis AI yang disesuaikan dengan strategi investasimu.
        </p>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
        style={{ background: "radial-gradient(60% 100% at 50% 100%, rgba(94,234,212,0.4), transparent 70%)" }}
      />

      <Link href="/analysis" className="btn btn-primary relative z-10 mt-8 shadow-[0_0_40px_rgba(45,212,191,0.45)]">
        Jelajahi Insight AI
      </Link>
    </section>
  );
}

/** Ringkasan 4 posisi terbesar. Rincian lengkap ada di /portfolio. */
function PortfolioCard({ holdings }: { holdings: Holding[] }) {
  return (
    <section className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Portofolioku</h2>
        <div className="flex items-center gap-2">
          <Link href="/portfolio" className="pill">
            Lihat semua
          </Link>
          <Link href="/portfolio" className="icon-btn h-9! w-9!" aria-label="Buka portofolio">
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {holdings.slice(0, 4).map((h) => (
          <article
            key={h.symbol}
            className="flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--card-soft)] p-4"
          >
            <div className="text-base font-medium">{compactIdr(h.units * h.price)}</div>
            <div className={`text-[11px] ${h.change >= 0 ? "up" : "down"}`}>{pct(h.change)}</div>
            <div className="mt-4">
              <SymbolDot symbol={h.symbol} color={h.color} size={32} />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--muted)]">
              <span className="text-[var(--text)]">{h.symbol}</span>
              <span>{num(h.units)} lembar</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
