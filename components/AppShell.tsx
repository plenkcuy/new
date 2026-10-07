"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Brand, Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // Tutup drawer dengan Esc dan kunci scroll halaman saat drawer terbuka.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] p-3 sm:p-5">
      {/* Catatan: jangan pakai backdrop-filter pada pembungkus ini; itu membuat
          elemen `fixed` (drawer) berpatokan ke pembungkus, bukan ke layar. */}
      <div className="grid gap-5 rounded-[32px] border border-white/5 bg-white/[0.04] p-3 sm:p-5 lg:grid-cols-[280px_1fr]">
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
        )}

        <Sidebar open={open} onClose={() => setOpen(false)} />

        <main className="flex min-w-0 flex-col gap-5">
          <div className="flex items-center justify-between lg:hidden">
            <Brand />
            <button type="button" className="icon-btn" aria-label="Buka menu" onClick={() => setOpen(true)}>
              <Menu size={20} />
            </button>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
