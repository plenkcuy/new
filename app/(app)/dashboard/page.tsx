import { AiInsights } from "@/components/dashboard/AiInsights";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { Portfolio } from "@/components/dashboard/Portfolio";
import { TotalHolding } from "@/components/dashboard/TotalHolding";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { PageHeader } from "@/components/ui/PageHeader";
import { UpgradeCard } from "@/components/ui/UpgradeCard";
import { requireSession } from "@/lib/auth/guards";
import { getHoldings, getPerformanceSeries, getPortfolioSummary, getWatchlist } from "@/lib/data/market";
import { isRange } from "@/lib/data/types";
import { can, limitsFor } from "@/lib/plans";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { user } = await requireSession();
  const limits = limitsFor(user.tier);

  // Rentang diminta lewat URL, tapi SERVER yang memutuskan: di luar jatah tier → rentang bawaan.
  const { range: requested } = await searchParams;
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
          <Portfolio holdings={holdings} />
        </div>
      </div>

      <PerformanceChart data={series} range={range} allowedRanges={limits.chartRanges} />
    </>
  );
}
