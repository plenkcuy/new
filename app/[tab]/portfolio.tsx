import Link from "next/link";
import { Download, Lock } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { can, deniedRedirect, limitsFor } from "@/lib/access";
import { getPortfolio } from "@/lib/journal";
import { RANGE_DAYS } from "@/lib/journal-calc";
import { isRange, type Ccy, type JournalMetric, type ScreenProps } from "@/lib/shared";
import { EquityChart } from "./journal-widgets";
import { LivePortfolio } from "./live-portfolio";

const FREE_METRICS: readonly JournalMetric[] = ["value", "pnl"];
const ALL_METRICS: readonly JournalMetric[] = ["value", "pnl", "twr", "dd"];

export async function PortfolioScreen({ user, query }: ScreenProps) {
  const limits = limitsFor(user.tier);
  const premium = can(user.tier, "journal-analytics");
  const realtime = limits.marketFeed === "realtime";

  const report: Ccy = query.ccy === "USD" ? "USD" : "IDR";
  const requested = query.range;
  const range = isRange(requested) && limits.chartRanges.includes(requested) ? requested : limits.defaultRange;

  const currencyHref = (c: Ccy) => {
    const params = new URLSearchParams();
    if (c === "USD") params.set("ccy", "USD");
    if (isRange(requested)) params.set("range", requested);
    const text = params.toString();
    return text ? `/portfolio?${text}` : "/portfolio";
  };

  const header = (
    <PageHeader title="Portofolio" subtitle="Posisi dari jurnalmu, dinilai dengan harga pasar terkini">
      <div className="flex flex-wrap items-center gap-2">
        {(["IDR", "USD"] as const).map((c) => (
          <Link key={c} href={currencyHref(c)} className="pill" data-active={report === c}>
            {c}
          </Link>
        ))}
        {can(user.tier, "export-csv") ? (
          // Endpoint /api/export memeriksa tier lagi di server.
          <a href={`/api/export${report === "USD" ? "?ccy=USD" : ""}`} download className="btn btn-ghost">
            <Download size={16} /> Ekspor CSV
          </a>
        ) : (
          <Link href={deniedRedirect("premium", "/portfolio")} className="btn btn-ghost">
            <Lock size={16} /> Ekspor CSV (Premium)
          </Link>
        )}
      </div>
    </PageHeader>
  );

  if (!process.env.DATABASE_URL) {
    return (
      <>
        {header}
        <section className="card p-6 text-sm leading-relaxed text-[var(--muted)]">
          Database belum terhubung. Isi <code className="text-[var(--accent)]">DATABASE_URL</code> dengan connection string Neon,
          lalu jalankan <code className="text-[var(--accent)]">db/001_journal.sql</code> sekali di Neon.
        </section>
      </>
    );
  }

  const data = await getPortfolio({
    userId: user.id,
    report,
    rangeDays: RANGE_DAYS[range],
    premium,
    maxAgeMs: realtime ? 10_000 : 60_000,
  });

  return (
    <>
      {header}
      <LivePortfolio
        positions={data.positions}
        realized={data.realized}
        usdIdr={data.usdIdr}
        report={report}
        realtime={realtime}
        pollMs={realtime ? 15_000 : 60_000}
        upgradeHref={deniedRedirect("premium", "/portfolio")}
      >
        <EquityChart
          data={data.equity.points}
          range={range}
          allowedRanges={limits.chartRanges}
          allowedMetrics={premium ? ALL_METRICS : FREE_METRICS}
          report={report}
        />
      </LivePortfolio>
      <p className="text-xs text-[var(--muted)]">
        Harga: Binance (crypto), Pluang (saham IDX), Reku (saham US), DexScreener (meme coin). Catatan jurnal, bukan saran investasi.
      </p>
    </>
  );
}
