import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Holding } from "@/lib/data/types";
import { compactIdr, num, pct } from "@/lib/format";
import { SymbolDot } from "@/components/ui/SymbolDot";

/** Ringkasan 4 posisi terbesar. Rincian lengkap ada di halaman /portfolio. */
export function Portfolio({ holdings }: { holdings: Holding[] }) {
  return (
    <section className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Portofolioku</h2>
        <div className="flex items-center gap-2">
          <Link href="/portfolio" className="pill">
            Lihat semua
          </Link>
          <Link href="/portfolio" className="icon-btn h-9! w-9!" aria-label="Buka portofolio">
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {holdings.slice(0, 4).map((h) => (
          <article
            key={h.symbol}
            className="flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--card-soft)] p-4"
          >
            <div className="text-base font-medium">{compactIdr(h.units * h.price)}</div>
            <div className={`text-[11px] ${h.change >= 0 ? "up" : "down"}`}>{pct(h.change)}</div>
            <div className="mt-4">
              <SymbolDot symbol={h.symbol} color={h.color} size={32} />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--muted)]">
              <span className="text-[var(--text)]">{h.symbol}</span>
              <span>{num(h.units)} lembar</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
