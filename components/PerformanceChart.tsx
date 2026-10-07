"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RANGES, getSeries, type Point, type Range } from "@/lib/data";
import { idr, pct } from "@/lib/format";

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
  const change = ((p.value - first) / first) * 100;
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1717] px-4 py-3 shadow-xl">
      <div className="text-[11px] text-[var(--muted)]">{fmt(p.t, fullFmt[range])}</div>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-sm font-medium">{idr(p.value)}</span>
        <span
          className={`rounded-md px-1.5 py-0.5 text-[11px] ${change >= 0 ? "up bg-emerald-500/15" : "down bg-red-500/15"}`}
        >
          {pct(change, 1)}
        </span>
      </div>
    </div>
  );
}

export function PerformanceChart() {
  const [range, setRange] = useState<Range>("1Y");
  const data = useMemo(() => getSeries(range), [range]);
  const first = data[0].value;

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg">Performa Portofolio</h2>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <button key={r} className="pill px-5!" data-active={range === r} onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-[260px] w-full sm:h-[300px]">
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
