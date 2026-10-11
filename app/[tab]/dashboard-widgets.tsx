"use client";

/** Dua widget interaktif dashboard. Hanya ini yang dikirim sebagai JS ke browser (bersama recharts). */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AssetIcon } from "@/components/asset-icon";
import { deniedRedirect } from "@/lib/access";
import {
  MARKET_COLOR,
  MARKET_LABEL,
  RANGES,
  axisMoney,
  idr,
  pct,
  unitPrice,
  type Point,
  type Range,
  type WatchMarket,
} from "@/lib/shared";

/* ---------- Watchlist ---------- */

const clock = (ms: number) =>
  new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(ms);

/**
 * `markets` sudah dibatasi oleh SERVER sesuai paket. `locked` hanya untuk
 * menampilkan ajakan upgrade, bukan untuk membuka data.
 */
export function Watchlist({ markets }: { markets: WatchMarket[] }) {
  const [market, setMarket] = useState(markets[0]?.market ?? "idx");
  const [listKey, setListKey] = useState<Record<string, string>>({});

  const current = markets.find((m) => m.market === market) ?? markets[0];
  if (!current) return null;

  const activeKey = listKey[current.market] ?? current.lists[0]?.key;
  const list = current.lists.find((l) => l.key === activeKey) ?? current.lists[0];

  return (
    <section className="card flex flex-col p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg">Watchlist</h2>
        {current.updatedAt && <span className="text-[11px] text-[var(--muted)]">Diperbarui {clock(current.updatedAt)} WIB</span>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {markets.map((m) => (
          <button key={m.market} type="button" className="pill" data-active={market === m.market} onClick={() => setMarket(m.market)}>
            {MARKET_LABEL[m.market]}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {current.lists.map((l) => (
          <button
            key={l.key}
            type="button"
            className="pill"
            data-active={list?.key === l.key}
            onClick={() => setListKey((prev) => ({ ...prev, [current.market]: l.key }))}
          >
            {l.label}
          </button>
        ))}
      </div>

      <ul className="mt-3 flex-1 divide-y divide-[var(--line)]">
        {(list?.items.length ?? 0) === 0 && (
          <li className="py-6 text-sm text-[var(--muted)]">
            {current.updatedAt ? "Tidak ada aset di daftar ini." : "Data pasar sedang dimuat. Muat ulang beberapa detik lagi."}
          </li>
        )}
        {list?.items.map((i) => (
          <li key={`${i.market}${i.symbol}`} className="flex items-center gap-3 py-3.5">
            <AssetIcon symbol={i.symbol} color={MARKET_COLOR[i.market]} icon={i.icon} size={36} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{i.symbol}</div>
              <div className="truncate text-[11px] text-[var(--muted)]">{i.name}</div>
            </div>
            <div className="text-right">
              <div className="text-sm">{unitPrice(i.price, i.ccy)}</div>
              <div className={`text-[11px] ${i.change >= 0 ? "up" : "down"}`}>{pct(i.change)}</div>
            </div>
          </li>
        ))}
      </ul>

      {list && list.locked > 0 && (
        <Link
          href={deniedRedirect("premium", "/dashboard")}
          className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-3 text-xs text-[var(--accent)] transition hover:border-white/30"
        >
          <Lock size={13} /> +{list.locked} aset lainnya khusus Premium
        </Link>
      )}
    </section>
  );
}

/* ---------- Grafik performa ---------- */

const tickFmt: Record<Range, Intl.DateTimeFormatOptions> = {
  "1D": { day: "numeric", month: "short", timeZone: "UTC" },
  "1W": { day: "numeric", month: "short", timeZone: "UTC" },
  "1M": { day: "numeric", month: "short", timeZone: "UTC" },
  "6M": { month: "short", timeZone: "UTC" },
  "1Y": { month: "short", timeZone: "UTC" },
};

const fullFmt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" };

const fmt = (t: number, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("id-ID", o).format(t);

type TipProps = {
  active?: boolean;
  payload?: { payload: Point }[];
  firstPnl: number;
};

function ChartTooltip({ active, payload, firstPnl }: TipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const gained = (p.pnl ?? 0) - firstPnl;
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1717] px-4 py-3 shadow-xl">
      <div className="text-[11px] text-[var(--muted)]">{fmt(p.t, fullFmt)}</div>
      <div className="mt-1 text-sm font-medium">{idr(p.value)}</div>
      {p.pnl !== undefined && (
        <div className={`mt-1 text-[11px] ${gained >= 0 ? "up" : "down"}`}>Untung rugi periode {idr(gained)}</div>
      )}
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
  const firstPnl = data[0]?.pnl ?? 0;

  // Rentang disimpan di URL (?range=). Server memvalidasi ulang terhadap paket.
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

      {data.length < 2 ? (
        <p className="py-16 text-center text-sm text-[var(--muted)]">Grafik muncul setelah ada transaksi di jurnal.</p>
      ) : (
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
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => axisMoney(v, "IDR")}
                tick={{ fill: "#86a09c", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip content={<ChartTooltip firstPnl={firstPnl} />} cursor={{ stroke: "rgba(255,255,255,0.45)", strokeDasharray: "4 4" }} />
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
      )}
    </section>
  );
}
