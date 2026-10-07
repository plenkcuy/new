"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import type { Tier } from "@/lib/auth/types";
import { Brand } from "./Brand";
import { Sidebar } from "./Sidebar";

type AppShellProps = {
  tier: Tier;
  /** Menu pengguna (server component) yang ditaruh di kanan atas. */
  actions: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({ tier, actions, children }: AppShellProps) {
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
      {/* Jangan pakai backdrop-filter di pembungkus ini: itu membuat elemen `fixed`
          (drawer) berpatokan ke pembungkus, bukan ke layar. */}
      <div className="grid gap-5 rounded-[32px] border border-white/5 bg-white/[0.04] p-3 sm:p-5 lg:grid-cols-[280px_1fr]">
        {open && (
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} aria-hidden />
        )}

        <Sidebar tier={tier} open={open} onClose={() => setOpen(false)} />

        <main className="relative flex min-w-0 flex-col gap-5">
          {/* Mobile: baris atas biasa. Desktop: menu pengguna melayang di kanan atas. */}
          <div className="flex items-center justify-between gap-3 lg:absolute lg:right-0 lg:top-0 lg:z-10">
            <div className="flex items-center gap-3 lg:hidden">
              <button type="button" className="icon-btn" aria-label="Buka menu" onClick={() => setOpen(true)}>
                <Menu size={20} />
              </button>
              <Brand compact />
            </div>
            {actions}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
