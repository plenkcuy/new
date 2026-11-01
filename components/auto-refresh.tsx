"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Memuat ulang data server component tiap beberapa menit, hanya saat tab sedang dilihat. */
export function AutoRefresh({ intervalMs = 5 * 60 * 1000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    const run = () => {
      if (document.visibilityState !== "visible") return;
      last = Date.now();
      router.refresh();
    };
    const timer = setInterval(run, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last >= intervalMs) run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
