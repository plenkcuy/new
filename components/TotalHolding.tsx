"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { RANGES, TOTAL_HOLDING, changePct, type Range } from "@/lib/data";
import { idr, pct } from "@/lib/format";

export function TotalHolding() {
  const [range, setRange] = useState<Range>("6M");
  const change = changePct(range);

  return (
    <section className="card-glow flex flex-col justify-between p-6" style={{ minHeight: 160 }}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Total Aset</h2>
        <label className="pill relative pr-9">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
            className="cursor-pointer appearance-none bg-transparent pr-2 outline-none"
            aria-label="Periode"
          >
            {RANGES.map((r) => (
              <option key={r} value={r} className="bg-[#060d0d]">
                {r}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3" />
        </label>
      </div>

      <div className="mt-6">
        <div className="text-3xl font-medium tracking-tight sm:text-[34px]">{idr(TOTAL_HOLDING)}</div>
        <div className={`mt-1 text-sm ${change >= 0 ? "up" : "down"}`}>
          {pct(change)} <span className="text-[var(--muted)]">dalam {range}</span>
        </div>
      </div>
    </section>
  );
}
