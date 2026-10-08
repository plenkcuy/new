"use client";

/** Dua widget interaktif dashboard. Hanya ini yang dikirim sebagai JS ke browser (bersama recharts). */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SymbolDot } from "@/components/ui";
import { deniedRedirect } from "@/lib/access";
import { RANGES, idr, num, pct, type Point, type Range, type WatchItem } from "@/lib/shared";

/* ---------- Watchlist ---------- */

const FILTERS = ["Terbanyak Dilihat", "Naik", "Turun"] as const;
type Filter = (typeof FILTERS)[number];

/**
 * `items` sudah dibatasi oleh SERVER sesuai tier. `lockedCount` hanya untuk
 * menampilkan ajakan upgrade, bukan untuk membuka data.
 */
export function Watchlist({ items, lockedCount }: { items: WatchItem[]; lockedCount: number }) {
  const [filter, setFilter] = useState<Filter>("Terbanyak Dilihat");

  const shown = useMemo(() => {
    const list = [...items];
    if (filter === "Naik") return list.filter((i) => i.change > 0).sort((a, b) => b.change - a.change);
    if (filter === "Turun") return list.filter((i) => i.change < 0).sort((a, b) => a.change - b.change);
    return list.sort((a, b) => b.views - a.views);
  }, [filter, items]);

  return (
    <section className="card flex flex-col p-6">
      <h2 className="text-lg">Watchlist</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} type="button" className="pill" data-active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      <ul className="mt-3 flex-1 divide-y divide-[var(--line)]">
        {shown.length === 0 && <li className="py-6 text-sm text-[var(--muted)]">Tidak ada saham pada filter ini.</li>}
        {shown.map((i) => (
          <li key={i.symbol} className="flex items-center gap-3 py-3.5">
            <SymbolDot symbol={i.symbol} color={i.color} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{i.symbol}</div>
              <div className="truncate text-[11px] text-[var(--muted)]">
                {i.exchange}: {i.name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm">Rp {num(i.price)}</div>
              <div className={`text-[11px] ${i.change >= 0 ? "up" : "down"}`}>{pct(i.change)}</div>
            </div>
          </li>
        ))}
      </ul>

      {lockedCount > 0 && (
        <Link
          href={deniedRedirect("premium", "/dashboard")}
          className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-3 text-xs text-[var(--accent)] transition hover:border-white/30"
        >
          <Lock size={13} /> +{lockedCount} saham lainnya khusus Premium
        </Link>
      )}
    </section>
  );
}

/* ---------- Grafik performa ---------- */

const tickFmt: Record<Range, Intl.DateTimeFormatOptions> = {
  "1D": { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" },
  "1W": { weekday: "short", timeZone: "UTC" },
  "1M": { day: "numeric", month: "short", timeZone: "UTC" },
  "6M": { month: "short", timeZone: "UTC" },
  "1Y": { month: "short", timeZone: "UTC" },
};

const fullFmt: Record<Range, Intl.DateTimeFormatOptions> = {
  "1D": { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" },
  "1W": { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" },
  "1M": { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" },
  "6M": { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" },
  "1Y": { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" },
};

const fmt = (t: number, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("id-ID", o).format(t);

type TipProps = {
  active?: boolean;
  payload?: { payload: Point }[];
  range: Range;
  first: number;
};

function ChartTooltip({ active, payload, range, first }: TipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const change = first === 0 ? 0 : ((p.value - first) / first) * 100;
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1717] px-4 py-3 shadow-xl">
      <div className="text-[11px] text-[var(--muted)]">{fmt(p.t, fullFmt[range])}</div>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-sm font-medium">{idr(p.value)}</span>
        <span className={`rounded-md px-1.5 py-0.5 text-[11px] ${change >= 0 ? "up bg-emerald-500/15" : "down bg-red-500/15"}`}>
          {pct(change, 1)}
        </span>
      </div>
    </div>
  );
}

type Props = {
  /** Data sudah disaring server sesuai rentang yang diizinkan. */
  data: Point[];
  range: Range;
  allowedRanges: readonly Range[];
};

export function PerformanceChart({ data, range, allowedRanges }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const first = data[0]?.value ?? 0;

  // Rentang disimpan di URL (?range=). Server memvalidasi ulang terhadap tier.
  const select = (r: Range) => startTransition(() => router.replace(`${pathname}?range=${r}`, { scroll: false }));

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg">Performa Portofolio</h2>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) =>
            allowedRanges.includes(r) ? (
              <button key={r} type="button" className="pill px-5!" data-active={range === r} onClick={() => select(r)}>
                {r}
              </button>
            ) : (
              <Link
                key={r}
                href={deniedRedirect("premium", `${pathname}?range=${r}`)}
                className="pill px-5! text-[var(--muted)]"
                title="Khusus Premium"
              >
                <Lock size={12} /> {r}
              </Link>
            ),
          )}
        </div>
      </div>

      <div className={`mt-4 h-[260px] w-full transition-opacity sm:h-[300px] ${pending ? "opacity-60" : ""}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={(t: number) => fmt(t, tickFmt[range])}
              tick={{ fill: "#86a09c", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={32}
            />
            <YAxis
              domain={["dataMin - 5000000", "dataMax + 5000000"]}
              tickFormatter={(v: number) => `${Math.round(v / 1_000_000)} jt`}
              tick={{ fill: "#86a09c", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              content={<ChartTooltip range={range} first={first} />}
              cursor={{ stroke: "rgba(255,255,255,0.45)", strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#5eead4"
              strokeWidth={2}
              fill="url(#perfFill)"
              activeDot={{ r: 6, fill: "#99f6e4", stroke: "rgba(153,246,228,0.35)", strokeWidth: 8 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
