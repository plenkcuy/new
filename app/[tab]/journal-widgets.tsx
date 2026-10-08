"use client";

/** Grafik jurnal. Data sudah disaring server sesuai tier, di sini hanya tampilan. */
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { deniedRedirect } from "@/lib/access";
import {
  JOURNAL_METRICS,
  METRIC_LABEL,
  RANGES,
  decimal,
  money,
  pct,
  type Ccy,
  type EquityPoint,
  type JournalMetric,
  type Range,
} from "@/lib/shared";

const dayFmt = (t: number, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("id-ID", { ...options, timeZone: "UTC" }).format(t);

function axisMoney(v: number, ccy: Ccy): string {
  const abs = Math.abs(v);
  if (ccy === "IDR") {
    if (abs >= 1e9) return `${(v / 1e9).toFixed(1).replace(".", ",")} M`;
    if (abs >= 1e6) return `${Math.round(v / 1e6)} jt`;
    if (abs >= 1e3) return `${Math.round(v / 1e3)} rb`;
    return String(Math.round(v));
  }
  return `$${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v)}`;
}

function formatMetric(v: number, metric: JournalMetric, ccy: Ccy): string {
  if (metric === "twr") return pct(v, 2);
  if (metric === "dd") return `${decimal(v, 2)}%`;
  return money(v, ccy);
}

/* ---------- Kurva ekuitas ---------- */

type TipProps = {
  active?: boolean;
  payload?: { payload: EquityPoint }[];
  metric: JournalMetric;
  report: Ccy;
};

function EquityTooltip({ active, payload, metric, report }: TipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const value = point[metric];
  if (value === undefined) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1717] px-4 py-3 shadow-xl">
      <div className="text-[11px] text-[var(--muted)]">
        {dayFmt(point.t, { day: "numeric", month: "short", year: "numeric" })}
      </div>
      <div className="mt-1 text-sm font-medium">{formatMetric(value, metric, report)}</div>
    </div>
  );
}

export function EquityChart({
  data,
  range,
  allowedRanges,
  allowedMetrics,
  report,
}: {
  data: EquityPoint[];
  range: Range;
  allowedRanges: readonly Range[];
  allowedMetrics: readonly JournalMetric[];
  report: Ccy;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [metric, setMetric] = useState<JournalMetric>("value");

  const selectRange = (r: Range) =>
    startTransition(() => {
      const next = new URLSearchParams(params.toString());
      next.set("range", r);
      next.delete("page");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });

  const lockedHref = (extra?: string) => deniedRedirect("premium", `${pathname}${extra ?? ""}`);
  const color = metric === "dd" ? "#f87171" : "#2dd4bf";

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg">Kurva Portofolio</h2>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) =>
            allowedRanges.includes(r) ? (
              <button key={r} type="button" className="pill px-5!" data-active={range === r} onClick={() => selectRange(r)}>
                {r}
              </button>
            ) : (
              <Link key={r} href={lockedHref(`?range=${r}`)} className="pill px-5! text-[var(--muted)]" title="Khusus Premium">
                <Lock size={12} /> {r}
              </Link>
            ),
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {JOURNAL_METRICS.map((m) =>
          allowedMetrics.includes(m) ? (
            <button key={m} type="button" className="pill" data-active={metric === m} onClick={() => setMetric(m)}>
              {METRIC_LABEL[m]}
            </button>
          ) : (
            <Link key={m} href={lockedHref()} className="pill text-[var(--muted)]" title="Khusus Premium">
              <Lock size={12} /> {METRIC_LABEL[m]}
            </Link>
          ),
        )}
      </div>

      {data.length < 2 ? (
        <p className="py-16 text-center text-sm text-[var(--muted)]">Kurva muncul setelah ada transaksi di jurnal.</p>
      ) : (
        <div className={`mt-4 h-[260px] w-full transition-opacity sm:h-[300px] ${pending ? "opacity-60" : ""}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="journalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={(t: number) => dayFmt(t, { day: "numeric", month: "short" })}
                tick={{ fill: "#86a09c", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={32}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(v: number) =>
                  metric === "twr" || metric === "dd" ? `${Math.round(v)}%` : axisMoney(v, report)
                }
                tick={{ fill: "#86a09c", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                content={<EquityTooltip metric={metric} report={report} />}
                cursor={{ stroke: "rgba(255,255,255,0.45)", strokeDasharray: "4 4" }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={color}
                strokeWidth={2}
                fill="url(#journalFill)"
                activeDot={{ r: 6, fill: "#99f6e4", stroke: "rgba(153,246,228,0.35)", strokeWidth: 8 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

/* ---------- Alokasi ---------- */

export type Slice = { label: string; value: number; share: number; color: string };

export function AllocationChart({ slices, report }: { slices: Slice[]; report: Ccy }) {
  return (
    <section className="card p-6">
      <h2 className="text-lg">Alokasi</h2>

      {slices.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--muted)]">Belum ada posisi terbuka.</p>
      ) : (
        <>
          <div className="mt-2 h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {slices.map((s) => (
                    <Cell key={s.label} fill={s.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 flex flex-col gap-3 text-sm">
            {slices.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
                  {s.label}
                </span>
                <span className="text-right text-[var(--muted)]">
                  {decimal(s.share, 1)}% · {money(s.value, report)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/* ---------- Untung rugi per aset ---------- */

export function PnlBars({ rows, report }: { rows: { symbol: string; pnl: number }[]; report: Ccy }) {
  return (
    <section className="card p-6">
      <h2 className="text-lg">Untung rugi per aset</h2>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--muted)]">Belum ada data.</p>
      ) : (
        <div className="mt-4 w-full" style={{ height: Math.max(180, rows.length * 38) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v: number) => axisMoney(v, report)}
                tick={{ fill: "#86a09c", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="symbol"
                tick={{ fill: "#eaf6f4", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={64}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                formatter={(value: number) => [money(value, report), "Untung rugi"]}
                contentStyle={{ background: "#0d1717", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }}
                labelStyle={{ color: "#86a09c" }}
                itemStyle={{ color: "#eaf6f4" }}
              />
              <Bar dataKey="pnl" radius={6} isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.symbol} fill={r.pnl >= 0 ? "#4ade80" : "#f87171"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
