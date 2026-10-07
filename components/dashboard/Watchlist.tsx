"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { deniedRedirect } from "@/lib/auth/access";
import type { WatchItem } from "@/lib/data/types";
import { num, pct } from "@/lib/format";
import { SymbolDot } from "@/components/ui/SymbolDot";

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
