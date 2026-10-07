"use client";

import { useState } from "react";
import { Mic } from "lucide-react";

const TABS = ["Pasar", "Dompet", "Alat"];

export function TopTabs() {
  const [active, setActive] = useState("Dompet");

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            className="pill pill-solid"
            data-active={active === t}
            onClick={() => setActive(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <label className="flex w-full items-center gap-3 rounded-full border border-[var(--line)] bg-[#060d0d]/80 px-5 py-3 text-[15px] text-[var(--muted)] sm:w-[360px]">
        <Mic size={18} strokeWidth={1.6} />
        <input
          type="text"
          placeholder="Tanya Lumen AI apa saja"
          className="w-full bg-transparent text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
        />
      </label>
    </div>
  );
}
