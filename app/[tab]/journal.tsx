import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Lock, Trash2 } from "lucide-react";
import { AssetIcon } from "@/components/asset-icon";
import { PageHeader, StatCard, UpgradeCard } from "@/components/ui";
import { can, deniedRedirect, limitsFor } from "@/lib/access";
import { getCloseTarget, getJournal, type JournalData } from "@/lib/journal";
import { RANGE_DAYS } from "@/lib/journal-calc";
import { deleteTrade } from "@/lib/journal-actions";
import {
  ASSET_CLASSES,
  CLASS_COLOR,
  CLASS_LABEL,
  IDX_LOT,
  decimal,
  formatDateTime,
  isAssetClass,
  isRange,
  money,
  num,
  pct,
  quantity,
  unitPrice,
  type Ccy,
  type JournalMetric,
  type ScreenProps,
} from "@/lib/shared";
import { AllocationChart, EquityChart, PnlBars } from "./journal-widgets";
import { TradeForm } from "./journal-form";

const ERRORS: Record<string, string> = {
  invalid: "Permintaan tidak valid.",
  missing: "Transaksi tidak ditemukan.",
  oversell: "Transaksi ini tidak bisa dihapus karena penjualan sesudahnya akan melebihi posisi.",
};

const FREE_METRICS: readonly JournalMetric[] = ["value", "pnl"];
const ALL_METRICS: readonly JournalMetric[] = ["value", "pnl", "twr", "dd"];

const tone = (n: number) => (n >= 0 ? "up" : "down");

export async function JournalScreen({ user, query }: ScreenProps) {
  const limits = limitsFor(user.tier);
  const premium = can(user.tier, "journal-analytics");

  const report: Ccy = query.ccy === "USD" ? "USD" : "IDR";
  const cls = isAssetClass(query.kelas) ? query.kelas : null;
  const requested = query.range;
  const range = isRange(requested) && limits.chartRanges.includes(requested) ? requested : limits.defaultRange;
  const page = Math.max(1, Math.floor(Number(query.page)) || 1);

  const href = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const current: Record<string, string | null> = {
      ccy: report === "USD" ? "USD" : null,
      kelas: cls,
      range: isRange(requested) ? requested : null,
      ...patch,
    };
    for (const [key, value] of Object.entries(current)) if (value) params.set(key, value);
    const text = params.toString();
    return text ? `/journal?${text}` : "/journal";
  };

  const header = (
    <PageHeader title="Jurnal" subtitle="Catat transaksi saham, crypto, dan meme coin, lalu pantau hasilnya dalam satu portofolio">
      <div className="flex flex-wrap items-center gap-2">
        {(["IDR", "USD"] as const).map((c) => (
          <Link key={c} href={href({ ccy: c === "USD" ? "USD" : null, page: null })} className="pill" data-active={report === c}>
            {c}
          </Link>
        ))}
        {can(user.tier, "export-csv") ? (
          <a href="/api/journal/export" download className="btn btn-ghost">
            <Download size={16} /> Ekspor CSV
          </a>
        ) : (
          <Link href={deniedRedirect("premium", "/journal")} className="btn btn-ghost">
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

  const data = await getJournal({ userId: user.id, report, cls, rangeDays: RANGE_DAYS[range], premium, page });
  const { summary, equity, analytics } = data;
  const empty = data.totalTrades === 0;

  // Tombol Tutup di tabel posisi mengisi form dari posisi yang dimaksud.
  const closeId = Number(query.close);
  const closeDirection = query.dir === "short" ? "short" : "long";
  const closeTarget = Number.isSafeInteger(closeId) && closeId > 0 ? await getCloseTarget(user.id, closeId, closeDirection) : null;

  const slices = summary.byClass.map((c) => ({
    label: CLASS_LABEL[c.assetClass],
    value: c.value,
    share: c.share,
    color: CLASS_COLOR[c.assetClass],
  }));

  return (
    <>
      {header}

      {query.error && ERRORS[query.error] && (
        <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          {ERRORS[query.error]}
        </div>
      )}

      <details id="form" className="card scroll-mt-24 p-6 [&_summary]:cursor-pointer" open={empty || closeTarget !== null}>
        <summary className="text-lg">{closeTarget ? `Tutup posisi ${closeTarget.direction === "short" ? "short " : ""}${closeTarget.symbol}` : "Catat transaksi baru"}</summary>
        <div className="mt-5">
          <TradeForm used={data.totalTrades} limit={limits.journalTrades} closeTarget={closeTarget} />
        </div>
      </details>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Nilai portofolio" value={money(summary.totals.value, report)} hint={`Modal ${money(summary.totals.cost, report)}`} />
        <StatCard
          label="Untung rugi belum terealisasi"
          value={money(summary.totals.unrealized, report)}
          hint={pct(summary.totals.unrealizedPct)}
          tone={summary.totals.unrealized >= 0 ? "up" : "down"}
        />
        <StatCard
          label="Untung rugi terealisasi"
          value={money(summary.totals.realized, report)}
          hint={`Pengaruh kurs ${money(summary.totals.fxEffect, report)}`}
          tone={summary.totals.realized >= 0 ? "up" : "down"}
        />
        <StatCard label="Transaksi tertutup" value={num(summary.closed.length)} hint={`${num(summary.positions.length)} posisi terbuka`} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={href({ kelas: null, page: null })} className="pill" data-active={cls === null}>
          Semua
        </Link>
        {ASSET_CLASSES.map((c) => (
          <Link key={c} href={href({ kelas: c, page: null })} className="pill" data-active={cls === c}>
            {CLASS_LABEL[c]}
          </Link>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <EquityChart
          data={equity.points}
          range={range}
          allowedRanges={limits.chartRanges}
          allowedMetrics={premium ? ALL_METRICS : FREE_METRICS}
          report={report}
        />
        <AllocationChart slices={slices} report={report} />
      </div>

      {analytics ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label={`Kinerja TWR (${range})`}
              value={pct(equity.twr)}
              hint="Tidak terpengaruh tambahan atau penarikan modal"
              tone={equity.twr >= 0 ? "up" : "down"}
            />
            <StatCard label="Penurunan maksimum" value={`${decimal(equity.maxDrawdown)}%`} hint={`Dari puncak ke lembah (${range})`} tone="down" />
            <StatCard
              label="Win rate"
              value={`${decimal(analytics.stats.winRate, 1)}%`}
              hint={`${num(analytics.stats.count)} transaksi tertutup`}
            />
            <StatCard
              label="Profit factor"
              value={analytics.stats.profitFactor === null ? "Belum ada rugi" : decimal(analytics.stats.profitFactor)}
              hint="Total untung dibagi total rugi"
            />
            <StatCard
              label="Expectancy"
              value={money(analytics.stats.expectancy, report)}
              hint="Rata rata hasil per transaksi"
              tone={analytics.stats.expectancy >= 0 ? "up" : "down"}
            />
            <StatCard
              label="Rata rata R"
              value={analytics.stats.avgR === null ? "Isi stop loss" : `${decimal(analytics.stats.avgR)}R`}
              hint="Hasil dibanding risiko awal"
            />
          </div>
          <PnlBars rows={analytics.pnlByAsset} report={report} />
        </>
      ) : (
        <UpgradeCard
          glow
          title="Analitik Jurnal"
          description="Win rate, profit factor, expectancy, kelipatan risiko, kinerja TWR, drawdown, dan untung rugi per aset tersedia di paket Premium."
          from="/journal"
          className="min-h-[200px]"
        />
      )}

      <PositionsTable positions={summary.positions} report={report} />
      <HistoryTable history={data.history} href={href} report={report} />

      <p className="text-xs text-[var(--muted)]">
        Harga pasar tertunda dan diperbarui harian. Catatan jurnal, bukan saran investasi. USDT dihitung setara 1 USD.
      </p>
    </>
  );
}

/* ---------- Tabel ---------- */

function PositionsTable({ positions, report }: { positions: JournalData["summary"]["positions"]; report: Ccy }) {
  return (
    <section className="card overflow-x-auto">
      <h2 className="p-6 pb-2 text-lg">Posisi terbuka</h2>
      {positions.length === 0 ? (
        <p className="p-6 pt-2 text-sm text-[var(--muted)]">Belum ada posisi terbuka.</p>
      ) : (
        <table className="data-table stack-lg">
          <thead>
            <tr>
              <th>Aset</th>
              <th className="num">Jumlah</th>
              <th className="num">Harga rata rata</th>
              <th className="num">Harga</th>
              <th className="num">Nilai</th>
              <th className="num">Untung rugi</th>
              <th className="num">Alokasi</th>
              <th aria-label="Aksi" />
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.assetId}>
                <td data-full>
                  <div className="flex items-center gap-3">
                    <AssetIcon symbol={p.symbol} color={CLASS_COLOR[p.assetClass]} icon={p.icon} size={32} />
                    <div>
                      <div>
                        {p.symbol}
                        {p.direction === "short" && <span className="badge badge-premium ml-2">Short</span>}
                      </div>
                      <div className="text-xs text-[var(--muted)]">{CLASS_LABEL[p.assetClass]}</div>
                    </div>
                  </div>
                </td>
                <td className="num" data-label="Jumlah">{p.assetClass === "idx" ? `${num(p.qty / IDX_LOT)} lot` : quantity(p.qty)}</td>
                <td className="num" data-label="Harga rata rata">{unitPrice(p.avgPrice, p.ccy)}</td>
                <td className="num" data-label="Harga">
                  {unitPrice(p.price, p.ccy)}
                  {p.priceFromTrade && (
                    <div className="mt-1">
                      <span className="badge badge-free" title="Belum ada data pasar terbaru, memakai harga transaksi terakhir">
                        dari transaksi
                      </span>
                    </div>
                  )}
                </td>
                <td className="num" data-label="Nilai" title={p.direction === "short" ? "Posisi short: nilai = untung rugi belum terealisasi (tanpa margin)" : undefined}>
                  {money(p.value, report)}
                </td>
                <td className={`num ${tone(p.unrealized)}`} data-label="Untung rugi">
                  {money(p.unrealized, report)}
                  <div className="text-xs">{pct(p.unrealizedPct)}</div>
                </td>
                <td className="num" data-label="Alokasi">{p.direction === "short" ? "" : `${decimal(p.share, 1)}%`}</td>
                <td data-actions>
                  <Link href={`/journal?close=${p.assetId}${p.direction === "short" ? "&dir=short" : ""}#form`} className="pill" aria-label={`Tutup posisi ${p.direction === "short" ? "short " : ""}${p.symbol}`}>
                    Tutup
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function HistoryTable({
  history,
  href,
  report,
}: {
  history: JournalData["history"];
  href: (patch: Record<string, string | null>) => string;
  report: Ccy;
}) {
  return (
    <section className="card overflow-x-auto">
      <h2 className="p-6 pb-2 text-lg">Riwayat transaksi ({num(history.total)})</h2>
      {history.rows.length === 0 ? (
        <p className="p-6 pt-2 text-sm text-[var(--muted)]">Belum ada transaksi. Catat transaksi pertamamu di atas.</p>
      ) : (
        <>
          <table className="data-table stack-xl">
            <thead>
              <tr>
                <th>Waktu (WIB)</th>
                <th>Aset</th>
                <th>Sisi</th>
                <th className="num">Jumlah</th>
                <th className="num">Harga</th>
                <th className="num">Fee</th>
                <th className="num">Hasil</th>
                <th>Catatan</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {history.rows.map((r) => (
                <tr key={r.id}>
                  <td className="text-[var(--muted)]" data-label="Waktu (WIB)" data-full>{formatDateTime(r.t)}</td>
                  <td data-full>
                    <div className="flex items-center gap-3">
                      <AssetIcon symbol={r.symbol} color={CLASS_COLOR[r.assetClass]} icon={r.icon} size={28} />
                      <div>
                        <div>{r.symbol}</div>
                        <div className="text-xs text-[var(--muted)]">{CLASS_LABEL[r.assetClass]}</div>
                      </div>
                    </div>
                  </td>
                  <td className={r.side === "buy" ? "up" : "down"} data-label="Sisi">
                    {r.direction === "short" ? (r.side === "sell" ? "Short" : "Cover") : r.side === "buy" ? "Beli" : "Jual"}
                    {r.linkId && (
                      <div className="mt-1">
                        <span className="badge badge-free" title="Dibuat dari satu input tandai close">
                          entry dan close
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="num" data-label="Jumlah">{r.assetClass === "idx" ? `${num(r.qty / IDX_LOT)} lot` : quantity(r.qty)}</td>
                  <td className="num" data-label="Harga">{unitPrice(r.price, r.ccy)}</td>
                  <td className="num text-[var(--muted)]" data-label="Fee">{unitPrice(r.fee, r.ccy)}</td>
                  <td className={`num ${r.result ? tone(r.result.pnl) : ""}`} data-label="Hasil">
                    {r.result ? (
                      <>
                        <div>{money(r.result.pnl, report)}</div>
                        <div className="text-xs">
                          {pct(r.result.pnlPct)}
                          {r.result.r !== null && ` · ${decimal(r.result.r)}R`}
                        </div>
                        {r.result.manual && (
                          <span className="badge badge-premium mt-1" title="Untung rugi diisi sendiri, bukan hitungan otomatis">
                            PnL manual
                          </span>
                        )}
                      </>
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="whitespace-normal sm:max-w-[220px]" data-label="Catatan" data-full data-empty={r.setup || r.emotion || r.tags.length > 0 || r.notes ? undefined : ""}>
                    <div className="flex flex-wrap gap-1.5">
                      {r.setup && <span className="badge badge-premium">{r.setup}</span>}
                      {r.emotion && <span className="badge badge-free">{r.emotion}</span>}
                      {r.tags.map((tag) => (
                        <span key={tag} className="badge badge-free">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    {r.notes && <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{r.notes}</p>}
                  </td>
                  <td data-actions>
                    <form action={deleteTrade}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        className="icon-btn h-9! w-9!"
                        aria-label="Hapus transaksi"
                        title={r.linkId ? "Hapus pasangan entry dan close" : "Hapus transaksi"}
                      >
                        <Trash2 size={15} />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {history.pages > 1 && (
            <div className="flex items-center justify-between gap-3 p-4 text-xs text-[var(--muted)]">
              {history.page > 1 ? (
                <Link href={href({ page: String(history.page - 1) })} className="pill">
                  <ChevronLeft size={14} /> Sebelumnya
                </Link>
              ) : (
                <span />
              )}
              <span>
                Halaman {history.page} dari {history.pages}
              </span>
              {history.page < history.pages ? (
                <Link href={href({ page: String(history.page + 1) })} className="pill">
                  Berikutnya <ChevronRight size={14} />
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
