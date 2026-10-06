import { ArrowUpRight } from "lucide-react";
import { HOLDINGS } from "@/lib/data";
import { compactIdr, num, pct } from "@/lib/format";

export function Portfolio() {
  return (
    <section className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Portofolioku</h2>
        <div className="flex items-center gap-2">
          <button className="pill">Lihat semua</button>
          <button className="icon-btn !h-9 !w-9" aria-label="Buka portofolio">
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {HOLDINGS.map((h) => {
          const value = h.units * h.price;
          return (
            <article
              key={h.symbol}
              className="flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--card-soft)] p-4"
            >
              <div className="text-base font-medium">{compactIdr(value)}</div>
              <div className={`text-[11px] ${h.change >= 0 ? "up" : "down"}`}>{pct(h.change)}</div>
              <div
                className="mt-4 flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                style={{ background: h.color }}
                aria-hidden
              >
                {h.symbol[0]}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--muted)]">
                <span className="text-[var(--text)]">{h.symbol}</span>
                <span>{num(h.units)} lembar</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
