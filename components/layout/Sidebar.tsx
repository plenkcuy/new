"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, X } from "lucide-react";
import { deniedRedirect, requiredTierFor } from "@/lib/auth/access";
import { hasTier } from "@/lib/auth/tiers";
import type { Tier } from "@/lib/auth/types";
import { Brand } from "./Brand";
import { NAV_ADMIN, NAV_FOOTER, NAV_MAIN, type NavItem } from "./nav-config";

type SidebarProps = {
  tier: Tier;
  /** Hanya berpengaruh di layar kecil (drawer). Di desktop sidebar selalu tampil. */
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ tier, open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

  const renderItem = (item: NavItem) => {
    const required = requiredTierFor(item.href);
    const locked = !hasTier(tier, required);
    const active = isActive(item);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        // Menu terkunci langsung menuju halaman upgrade (tanpa redirect tambahan).
        href={locked ? deniedRedirect(required, item.href) : item.href}
        className="nav-item"
        data-active={active}
        aria-current={active ? "page" : undefined}
        onClick={onClose}
      >
        <Icon size={20} strokeWidth={1.6} />
        <span>{item.label}</span>
        {locked && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-[var(--accent)]">
            <Lock size={12} /> PRO
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside
      aria-label="Navigasi utama"
      className={[
        "card fixed inset-y-3 left-3 z-50 flex w-[280px] max-w-[85vw] flex-col overflow-y-auto p-4",
        "transition-[transform,visibility] duration-300 ease-out",
        open ? "visible translate-x-0" : "invisible -translate-x-[115%]",
        "lg:visible lg:static lg:z-auto lg:w-auto lg:max-w-none lg:translate-x-0",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-3 pb-8 pt-4">
        <Brand />
        <button type="button" className="icon-btn h-10! w-10! lg:hidden" aria-label="Tutup menu" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <nav className="flex flex-col gap-2">{NAV_MAIN.map(renderItem)}</nav>

      {hasTier(tier, "admin") && (
        <nav className="mt-6 flex flex-col gap-2">
          <div className="px-4 text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">Admin</div>
          {NAV_ADMIN.map(renderItem)}
        </nav>
      )}

      <nav className="mt-auto flex flex-col gap-1 pb-2 pt-6">{NAV_FOOTER.map(renderItem)}</nav>
    </aside>
  );
}
