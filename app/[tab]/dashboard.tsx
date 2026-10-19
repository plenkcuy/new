import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AssetIcon } from "@/components/asset-icon";
import { FitText } from "@/components/fit-text";
import { PageHeader, UpgradeCard } from "@/components/ui";
import { MARKET_MAX_AGE_MS, can, limitsFor } from "@/lib/access";
import { getPortfolio } from "@/lib/journal";
import { RANGE_DAYS, convRate } from "@/lib/journal-calc";
import { getWatchlistData } from "@/lib/market-lists";
import { CLASS_COLOR, compactIdr, idr, isRange, num, pct, quantity, type LivePosition, type ScreenProps } from "@/lib/shared";
import { PerformanceChart, Watchlist } from "./dashboard-widgets";

export async function DashboardScreen({ user, query }: ScreenProps) {
  const limits = limitsFor(user.tier);

  // Rentang diminta lewat URL, tapi SERVER yang memutuskan: di luar jatah paket, pakai rentang bawaan.
  const requested = query.range;
  const range = isRange(requested) && limits.chartRanges.includes(requested) ? requested : limits.defaultRange;
  const firstName = user.name.split(" ")[0];

  const header = (
    <PageHeader
      title={
        <>
          Selamat datang, <span className="text-[var(--accent)]">{firstName}</span>
        </>
      }
      subtitle="Ringkasan portofolio investasimu hari ini"
    />
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

  const [portfolio, watchlist] = await Promise.all([
    getPortfolio({
      userId: user.id,
      report: "IDR",
      rangeDays: RANGE_DAYS[range],
      premium: can(user.tier, "journal-analytics"),
      maxAgeMs: limits.marketFeed === "realtime" ? 10_000 : 60_000,
      liveTimeoutMs: 1800,
    }),
    getWatchlistData(limits.watchlistItems, MARKET_MAX_AGE_MS[limits.marketFeed]),
  ]);

  const chart = portfolio.equity.points.map((p) => ({ t: p.t, value: p.value, pnl: p.pnl }));

  return (
    <>
      {header}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-[1fr_1.05fr_1fr]">
        <div className="flex min-w-0 flex-col gap-5">
          <TotalHolding value={portfolio.totals.value} unrealizedPct={portfolio.totals.unrealizedPct} hasTrades={portfolio.totalTrades > 0} />
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

        <Watchlist markets={watchlist} />

        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          <PortfolioCard positions={portfolio.positions} usdIdr={portfolio.usdIdr} />
        </div>
      </div>

      <PerformanceChart data={chart} range={range} allowedRanges={limits.chartRanges} />
    </>
  );
}

/* ---------- Kartu khusus dashboard (server component) ---------- */

function TotalHolding({ value, unrealizedPct, hasTrades }: { value: number; unrealizedPct: number; hasTrades: boolean }) {
  return (
    <section className="card-glow flex flex-col justify-between p-6" style={{ minHeight: 160 }}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Nilai Portofolio</h2>
        <Link href="/portfolio" className="pill">
          Rincian
        </Link>
      </div>

      <div className="mt-6">
        <div className="font-medium tracking-tight">
          <FitText max={34} min={18}>
            {idr(value)}
          </FitText>
        </div>
        {hasTrades ? (
          <div className={`mt-1 text-sm ${unrealizedPct >= 0 ? "up" : "down"}`}>
            {pct(unrealizedPct)} <span className="text-[var(--muted)]">untung rugi dari modal</span>
          </div>
        ) : (
          <div className="mt-1 text-sm text-[var(--muted)]">
            Belum ada transaksi.{" "}
            <Link href="/journal" className="text-[var(--accent)] hover:underline">
              Catat di Jurnal
            </Link>
          </div>
        )}
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
function PortfolioCard({ positions, usdIdr }: { positions: LivePosition[]; usdIdr: number }) {
  const top = positions
    .map((p) => {
      const market = p.qty * p.price * convRate(p.ccy, "IDR", usdIdr);
      // Short: nilai = untung rugi belum terealisasi (sudah dihitung server dalam rupiah).
      return { ...p, idrValue: p.direction === "short" ? p.value : market };
    })
    .sort((a, b) => b.idrValue - a.idrValue)
    .slice(0, 4);

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg">Portofolioku</h2>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/portfolio" className="pill whitespace-nowrap">
            Lihat semua
          </Link>
          <Link href="/portfolio" className="icon-btn h-9! w-9! max-sm:hidden" aria-label="Buka portofolio">
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>

      {top.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Belum ada posisi. Catat transaksi beli di{" "}
          <Link href="/journal" className="text-[var(--accent)] hover:underline">
            Jurnal
          </Link>{" "}
          dan posisimu muncul di sini.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {top.map((h) => (
            <article
              key={`${h.assetId}${h.direction}`}
              className="flex min-w-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--card-soft)] p-4"
            >
              <div className="font-medium">
                <FitText max={16} min={11}>
                  {compactIdr(h.idrValue)}
                </FitText>
              </div>
              <div className={`text-[11px] ${h.unrealizedPct >= 0 ? "up" : "down"}`}>{pct(h.unrealizedPct)}</div>
              <div className="mt-4">
                <AssetIcon symbol={h.symbol} color={CLASS_COLOR[h.assetClass]} icon={h.icon} size={32} />
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--muted)]">
                <span className="text-[var(--text)]">
                  {h.symbol}
                  {h.direction === "short" && " (short)"}
                </span>
                <span>{h.assetClass === "idx" ? `${num(h.qty / 100)} lot` : quantity(h.qty)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
