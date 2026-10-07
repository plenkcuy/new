import { idr, pct } from "@/lib/format";

export function TotalHolding({ total, change, rangeLabel }: { total: number; change: number; rangeLabel: string }) {
  return (
    <section className="card-glow flex flex-col justify-between p-6" style={{ minHeight: 160 }}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Total Aset</h2>
        <span className="pill">{rangeLabel}</span>
      </div>

      <div className="mt-6">
        <div className="text-3xl font-medium tracking-tight sm:text-[34px]">{idr(total)}</div>
        <div className={`mt-1 text-sm ${change >= 0 ? "up" : "down"}`}>
          {pct(change)} <span className="text-[var(--muted)]">dalam {rangeLabel}</span>
        </div>
      </div>
    </section>
  );
}
