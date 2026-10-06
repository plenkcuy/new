"use client";

import { useMemo, useState } from "react";
import { WATCHLIST } from "@/lib/data";
import { num, pct } from "@/lib/format";

const FILTERS = ["Terbanyak Dilihat", "Naik", "Turun"] as const;
type Filter = (typeof FILTERS)[number];

export function Watchlist() {
  const [filter, setFilter] = useState<Filter>("Terbanyak Dilihat");

  const items = useMemo(() => {
    const list = [...WATCHLIST];
    if (filter === "Naik") return list.filter((i) => i.change > 0).sort((a, b) => b.change - a.change).slice(0, 4);
    if (filter === "Turun") return list.filter((i) => i.change < 0).sort((a, b) => a.change - b.change).slice(0, 4);
    return list.sort((a, b) => b.views - a.views).slice(0, 4);
  }, [filter]);

  return (
    <section className="card flex flex-col p-6">
      <h2 className="text-lg">Watchlist</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} className="pill" data-active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      <ul className="mt-3 flex-1 divide-y divide-[var(--line)]">
        {items.length === 0 && <li className="py-6 text-sm text-[var(--muted)]">Belum ada data.</li>}
        {items.map((i) => (
          <li key={i.symbol} className="flex items-center gap-3 py-3.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ background: i.color }}
              aria-hidden
            >
              {i.symbol[0]}
            </div>
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
    </section>
  );
}
