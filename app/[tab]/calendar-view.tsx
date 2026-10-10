"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import {
  CLASS_LABEL,
  IDX_LOT,
  compactMoney,
  decimal,
  money,
  num,
  pct,
  quantity,
  type CalendarDay,
  type Ccy,
} from "@/lib/shared";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/** Angka negatif memakai tanda minus tipografis, bukan tanda hubung. */
const minus = (text: string) => text.replace(/-/g, "\u2212");

const keyOf = (month: string, day: number) => `${month}-${String(day).padStart(2, "0")}`;

function shift(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const longDate = (key: string) =>
  new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${key}T00:00:00Z`),
  );

type Props = {
  days: Record<string, CalendarDay>;
  report: Ccy;
  todayKey: string;
  minMonth: string;
  maxMonth: string;
  limited: boolean;
  upgradeHref: string;
};

export function CalendarView({ days, report, todayKey, minMonth, maxMonth, limited, upgradeHref }: Props) {
  const [month, setMonth] = useState(maxMonth);
  const [selected, setSelected] = useState<string | null>(todayKey in days ? todayKey : null);

  const [year, monthNumber] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const prevMonthDays = new Date(Date.UTC(year, monthNumber - 1, 0)).getUTCDate();
  const trailing = Math.ceil((firstWeekday + daysInMonth) / 7) * 7 - (firstWeekday + daysInMonth);

  const summary = useMemo(() => {
    let net = 0;
    let winDays = 0;
    let lossDays = 0;
    let trades = 0;
    let best: { key: string; pnl: number } | null = null;
    let worst: { key: string; pnl: number } | null = null;

    for (let d = 1; d <= daysInMonth; d++) {
      const key = keyOf(month, d);
      const day = days[key];
      if (!day || day.trades.length === 0) continue;
      net += day.pnl;
      trades += day.trades.length;
      if (day.pnl > 0) winDays += 1;
      else if (day.pnl < 0) lossDays += 1;
      if (!best || day.pnl > best.pnl) best = { key, pnl: day.pnl };
      if (!worst || day.pnl < worst.pnl) worst = { key, pnl: day.pnl };
    }
    const traded = winDays + lossDays;
    return { net, winDays, lossDays, trades, winRate: traded ? Math.round((winDays / traded) * 100) : 0, best, worst };
  }, [days, month, daysInMonth]);

  const goTo = (target: string) => {
    setMonth(target);
    setSelected(null);
  };

  const canPrev = month > minMonth;
  const canNext = month < maxMonth;
  const detail = selected ? days[selected] : undefined;
  const dayLabel = (key: string | undefined) => (key ? Number(key.slice(8)) : null);

  return (
    <div className="flex flex-col gap-5">
      {/* Ringkasan bulan */}
      <div className="flex snap-x gap-4 overflow-x-auto pb-1">
        <div className="card relative min-w-[160px] flex-1 snap-start overflow-hidden p-5">
          <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-[100%] bg-teal-500/10" aria-hidden />
          <span className="text-xs text-[var(--muted)]">Net PnL</span>
          <div
            className={`mt-1 text-2xl font-extrabold ${summary.net > 0 ? "up" : summary.net < 0 ? "down" : ""}`}
            data-testid="net-pnl"
          >
            {minus(money(summary.net, report))}
          </div>
          <div className="mt-1 text-[11px] text-[var(--muted)]">{num(summary.trades)} transaksi tertutup</div>
        </div>

        <div className="card flex min-w-[130px] snap-start flex-col items-center justify-center p-5">
          <span className="mb-2 text-xs text-[var(--muted)]">Win rate hari</span>
          <div className="relative flex h-14 w-14 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={summary.winRate >= 50 ? "#2dd4bf" : "#fb7185"}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${summary.winRate}, 100`}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <span className="relative z-10 text-sm font-bold" data-testid="win-rate">
              {summary.winRate}%
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[var(--muted)]">
            {summary.winDays} profit · {summary.lossDays} rugi
          </div>
        </div>

        <div className="card min-w-[150px] snap-start p-5">
          <span className="text-xs text-[var(--muted)]">Hari terbaik</span>
          <div className="up mt-1 text-xl font-extrabold">{summary.best && summary.best.pnl > 0 ? minus(money(summary.best.pnl, report)) : "Belum ada"}</div>
          <div className="mt-1 text-[11px] text-[var(--muted)]">
            {summary.best && summary.best.pnl > 0 ? `Tanggal ${dayLabel(summary.best.key)}` : "\u00A0"}
          </div>
        </div>

        <div className="card min-w-[150px] snap-start p-5">
          <span className="text-xs text-[var(--muted)]">Hari terburuk</span>
          <div className="down mt-1 text-xl font-extrabold">{summary.worst && summary.worst.pnl < 0 ? minus(money(summary.worst.pnl, report)) : "Belum ada"}</div>
          <div className="mt-1 text-[11px] text-[var(--muted)]">
            {summary.worst && summary.worst.pnl < 0 ? `Tanggal ${dayLabel(summary.worst.key)}` : "\u00A0"}
          </div>
        </div>
      </div>

      {/* Kalender */}
      <section className="card p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between px-1">
          <button type="button" className="icon-btn" aria-label="Bulan sebelumnya" disabled={!canPrev} onClick={() => goTo(shift(month, -1))}>
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-lg font-bold tracking-wide" data-testid="month-title">
            {MONTHS[monthNumber - 1]} {year}
          </h2>
          <button type="button" className="icon-btn" aria-label="Bulan berikutnya" disabled={!canNext} onClick={() => goTo(shift(month, 1))}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="mb-3 grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] sm:gap-2">
          {WEEKDAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="grid" aria-label={`Kalender PnL ${MONTHS[monthNumber - 1]} ${year}`}>
          {Array.from({ length: firstWeekday }, (_, i) => (
            <div
              key={`p${i}`}
              className="flex aspect-square items-center justify-center rounded-2xl border border-white/[0.02] bg-white/[0.01] opacity-30"
              aria-hidden
            >
              <span className="text-[10px] text-[var(--muted)]">{prevMonthDays - firstWeekday + i + 1}</span>
            </div>
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const key = keyOf(month, d);
            const day = days[key];
            const pnl = day && day.trades.length > 0 ? day.pnl : 0;
            const isToday = key === todayKey;
            const isSelected = key === selected;

            let box = "border-white/[0.05] bg-white/[0.02]";
            let text = "";
            let dateColor = isToday ? "text-teal-300" : "text-[var(--muted)]";
            if (pnl > 0) {
              box = "border-emerald-500/20 bg-emerald-500/10 shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]";
              text = "text-emerald-400";
              dateColor = "text-emerald-200/60";
            } else if (pnl < 0) {
              box = "border-rose-500/20 bg-rose-500/10 shadow-[inset_0_0_15px_rgba(244,63,94,0.1)]";
              text = "text-rose-400";
              dateColor = "text-rose-200/60";
            }

            return (
              <button
                key={key}
                type="button"
                role="gridcell"
                aria-label={`${longDate(key)}${pnl !== 0 ? `, ${minus(money(pnl, report))}` : ""}`}
                aria-pressed={isSelected}
                onClick={() => setSelected(isSelected ? null : key)}
                className={`relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-2xl border transition active:scale-90 ${box} ${
                  isSelected ? "ring-2 ring-[var(--accent)]" : ""
                }`}
              >
                {isToday && (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-white shadow-[0_0_5px_white]" aria-hidden />
                )}
                <span className={`absolute left-1.5 top-1 text-[9px] font-bold ${dateColor}`}>{d}</span>
                {pnl !== 0 ? (
                  <span className={`mt-2 text-[10px] font-extrabold tracking-tight sm:text-xs ${text}`}>{compactMoney(pnl, report)}</span>
                ) : (
                  day && day.buys > 0 && <span className="mt-2 h-1.5 w-1.5 rounded-full bg-teal-400/60" aria-hidden />
                )}
              </button>
            );
          })}

          {Array.from({ length: trailing }, (_, i) => (
            <div
              key={`n${i}`}
              className="flex aspect-square items-center justify-center rounded-2xl border border-white/[0.02] bg-white/[0.01] opacity-30"
              aria-hidden
            >
              <span className="text-[10px] text-[var(--muted)]">{i + 1}</span>
            </div>
          ))}
        </div>

        {limited && month === minMonth && (
          <Link href={upgradeHref} className="mt-4 inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline">
            <Lock size={12} /> Riwayat lebih lama khusus Premium
          </Link>
        )}
      </section>

      {/* Detail hari */}
      <section className="card p-6" aria-live="polite">
        {!selected ? (
          <p className="text-sm text-[var(--muted)]">
            Ketuk tanggal untuk melihat rincian transaksi. Titik kecil berarti ada transaksi beli di hari itu. Hasil dihitung dari transaksi jual dan memakai tanggal WIB.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-bold">{longDate(selected)}</h3>
              {detail && detail.trades.length > 0 && (
                <span className={`text-lg font-extrabold ${detail.pnl >= 0 ? "up" : "down"}`}>{minus(money(detail.pnl, report))}</span>
              )}
            </div>

            {!detail ? (
              <p className="mt-3 text-sm text-[var(--muted)]">Tidak ada transaksi di tanggal ini.</p>
            ) : (
              <>
                {detail.trades.length > 0 && (
                  <ul className="mt-4 flex flex-col divide-y divide-white/5">
                    {detail.trades.map((t, i) => (
                      <li key={`${t.symbol}${i}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <div>
                          <div className="font-semibold">{t.symbol}</div>
                          <div className="text-[11px] text-[var(--muted)]">
                            {CLASS_LABEL[t.assetClass]} · jual {t.assetClass === "idx" ? `${num(t.qty / IDX_LOT)} lot` : quantity(t.qty)}
                          </div>
                        </div>
                        <div className={`text-right ${t.pnl >= 0 ? "up" : "down"}`}>
                          <div className="font-bold">{minus(money(t.pnl, report))}</div>
                          <div className="text-[11px]">
                            {minus(pct(t.pnlPct))}
                            {t.r !== null && ` · ${minus(decimal(t.r))}R`}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {detail.buys > 0 && (
                  <p className="mt-3 text-xs text-[var(--muted)]">{num(detail.buys)} transaksi beli di hari ini. Hasilnya masuk kalender saat posisi dijual.</p>
                )}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
