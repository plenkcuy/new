"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { AssetHit, SearchClass } from "@/lib/asset-search";
import { money } from "@/lib/shared";

const KIND_LABEL: Record<AssetHit["kind"], string> = {
  recent: "Terakhir dipakai",
  list: "Daftar Pasar",
  catalog: "Binance Spot",
  lookup: "Cek kode ini",
};

type Props = {
  id: string;
  label: string;
  className: string;
  labelClassName: string;
  assetClass: SearchClass;
  value: string;
  placeholder: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
  onPick: (hit: AssetHit) => void;
  onCommit: (value: string) => void;
};

/**
 * Kolom kode aset dengan saran pencarian. Mengikuti pola combobox WAI-ARIA (daftar saran dengan pilihan manual):
 * fokus tetap di kolom input, panah memindahkan sorotan, Enter memilih, Escape menutup, dan teks yang diketik
 * tetap sah sebagai nilai bila tidak ada saran yang dipilih.
 */
export function AssetCombobox({ id, label, className, labelClassName, assetClass, value, placeholder, readOnly, onChange, onPick, onCommit }: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<AssetHit[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const typed = useRef(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (readOnly || !typed.current) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setProblem(null);
      try {
        const res = await fetch(`/api/assets/search?class=${assetClass}&q=${encodeURIComponent(value.slice(0, 24))}`, {
          signal: controller.signal,
          credentials: "same-origin",
        });
        if (res.status === 429) {
          setProblem("Terlalu banyak pencarian. Tunggu sebentar lalu coba lagi.");
          setHits([]);
          return;
        }
        if (!res.ok) throw new Error("gagal");
        const json = (await res.json()) as { results?: AssetHit[] };
        const results = Array.isArray(json.results) ? json.results.slice(0, 8) : [];
        setHits(results);
        setActive(results.length ? 0 : -1);
        setOpen(true);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setProblem("Pencarian belum bisa dimuat. Kamu tetap bisa mengetik kodenya langsung.");
        setHits([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, assetClass, readOnly, focusTick]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (hit: AssetHit) => {
    typed.current = false;
    setOpen(false);
    setHits([]);
    setActive(-1);
    onPick(hit);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!hits.length) return;
      e.preventDefault();
      setOpen(true);
      setActive((i) => (e.key === "ArrowDown" ? (i + 1) % hits.length : (i - 1 + hits.length) % hits.length));
    } else if (e.key === "Enter") {
      if (open && active >= 0 && hits[active]) {
        e.preventDefault();
        pick(hits[active]);
      } else if (value.trim()) {
        e.preventDefault();
        typed.current = false;
        setOpen(false);
        onCommit(value);
      }
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const expanded = open && (hits.length > 0 || Boolean(problem));
  const status = loading ? "Mencari" : problem ? problem : expanded ? `${hits.length} saran tersedia` : "";

  return (
    <div ref={box} className="relative">
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name="symbol"
          required
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
          maxLength={20}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className={className}
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={(e) => {
            typed.current = true;
            onChange(e.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => {
            if (readOnly) return;
            typed.current = true;
            if (!value) setFocusTick((n) => n + 1);
            else if (hits.length) setOpen(true);
          }}
          onBlur={() => {
            if (!open && value.trim() && !readOnly) onCommit(value);
          }}
          onKeyDown={onKeyDown}
        />
        {loading && <Loader2 size={16} aria-hidden className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[var(--muted)]" />}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      <ul
        id={listId}
        role="listbox"
        aria-label={`Saran ${label}`}
        hidden={!expanded}
        className="absolute left-0 top-full z-30 mt-2 max-h-80 w-[min(24rem,calc(100vw-3rem))] overflow-y-auto rounded-2xl border border-[var(--line)] bg-[#0b1515] p-1.5 shadow-xl"
      >
        {problem && hits.length === 0 && <li role="presentation" className="px-3 py-2.5 text-sm text-[var(--muted)]">{problem}</li>}
        {hits.map((hit, i) => (
          <li
            key={hit.symbol}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(hit)}
            onMouseMove={() => setActive(i)}
            className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${i === active ? "bg-white/10" : ""}`}
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium">{hit.symbol}</span>
              <span className="block truncate text-xs text-[var(--muted)]">{hit.name ?? KIND_LABEL[hit.kind]}</span>
            </span>
            <span className="shrink-0 text-right text-xs text-[var(--muted)]">
              {hit.price ? <span className="block tabular-nums text-[var(--text)]">{money(hit.price, hit.ccy)}</span> : null}
              {hit.name || hit.price ? KIND_LABEL[hit.kind] : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
