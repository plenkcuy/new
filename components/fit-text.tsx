"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * Teks satu baris yang otomatis mengecil sampai muat di lebar pembungkusnya, tidak pernah lebih kecil
 * dari `min`. Server merender ukuran `max` (px). Di browser ukurannya diukur ulang sebelum tampil,
 * lalu setiap lebar pembungkus berubah (putar layar, ganti ukuran jendela) atau font selesai dimuat.
 */
export function FitText({
  children,
  max,
  min = 9,
  className = "",
}: {
  children: ReactNode;
  /** Ukuran huruf terbesar (px), dipakai bila muat. */
  max: number;
  /** Ukuran huruf terkecil (px). */
  min?: number;
  className?: string;
}) {
  const box = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);

  const fit = useCallback(() => {
    const outer = box.current;
    const inner = text.current;
    if (!outer || !inner) return;
    const available = outer.clientWidth;
    if (available <= 0) return;

    inner.style.fontSize = `${max}px`;
    const needed = inner.scrollWidth;
    if (needed > available) {
      const scaled = Math.floor(((max * available) / needed) * 10) / 10;
      inner.style.fontSize = `${Math.max(min, scaled)}px`;
    }
  }, [max, min]);

  // Setiap render: isi teks bisa berubah (harga bergerak, ganti bulan).
  useLayoutEffect(() => {
    fit();
  });

  useEffect(() => {
    const outer = box.current;
    if (!outer) return;
    void document.fonts?.ready.then(fit);

    // Browser yang belum punya ResizeObserver memakai perubahan ukuran jendela.
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", fit);
      return () => window.removeEventListener("resize", fit);
    }
    const observer = new ResizeObserver(() => fit());
    observer.observe(outer);
    return () => observer.disconnect();
  }, [fit]);

  return (
    <span ref={box} className={`block w-full overflow-hidden whitespace-nowrap ${className}`} style={{ lineHeight: 1.2 }}>
      <span ref={text} className="inline-block" style={{ fontSize: max }}>
        {children}
      </span>
    </span>
  );
}
