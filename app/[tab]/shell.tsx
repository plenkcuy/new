"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  Lock,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Brand, TierBadge } from "@/components/ui";
import { deniedRedirect, hasTier, requiredTierFor } from "@/lib/access";
import { logout } from "@/lib/actions";
import type { SessionUser, Tier } from "@/lib/shared";

/**
 * Menu sidebar. Tier minimum TIDAK ditulis di sini, melainkan diambil dari
 * `requiredTierFor(href)` (lib/access.ts) supaya satu sumber kebenaran.
 */
type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_MAIN: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portofolio", icon: Briefcase },
  { href: "/journal", label: "Jurnal", icon: BookOpen },
  { href: "/calendar", label: "Kalender", icon: CalendarDays },
  { href: "/analysis", label: "Analisis", icon: BarChart3 },
  { href: "/market", label: "Pasar", icon: LineChart },
  { href: "/community", label: "Komunitas", icon: Users },
];
/** Hanya ditampilkan untuk Admin. */
const NAV_ADMIN: NavItem = { href: "/admin", label: "Admin", icon: ShieldCheck };
const NAV_FOOTER: NavItem[] = [
  { href: "/settings", label: "Pengaturan", icon: Settings },
  { href: "/support", label: "Bantuan", icon: LifeBuoy },
];

function Sidebar({ tier, open, onClose }: { tier: Tier; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const main = hasTier(tier, "admin") ? [...NAV_MAIN, NAV_ADMIN] : NAV_MAIN;

  const renderItem = (item: NavItem) => {
    const required = requiredTierFor(item.href);
    const locked = !hasTier(tier, required);
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
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

      <nav className="flex flex-col gap-2">{main.map(renderItem)}</nav>
      <nav className="mt-auto flex flex-col gap-1 pb-2 pt-6">{NAV_FOOTER.map(renderItem)}</nav>
    </aside>
  );
}

function UserMenu({ user }: { user: SessionUser }) {
  const initials = user.name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <Link href="/settings" className="flex items-center gap-3" aria-label="Buka pengaturan akun">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-base font-medium text-white"
          style={{ background: "linear-gradient(135deg,#14b8a6,#115e59)" }}
          aria-hidden
        >
          {initials}
        </div>
        <div className="hidden text-left leading-tight md:block">
          <div className="text-sm">{user.name}</div>
          <div className="mt-1">
            <TierBadge tier={user.tier} />
          </div>
        </div>
      </Link>

      <form action={logout}>
        <button type="submit" className="icon-btn" aria-label="Keluar" title="Keluar">
          <LogOut size={20} strokeWidth={1.6} />
        </button>
      </form>
    </div>
  );
}

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
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

        <Sidebar tier={user.tier} open={open} onClose={() => setOpen(false)} />

        <main className="relative flex min-w-0 flex-col gap-5">
          {/* Mobile: baris atas biasa. Desktop: menu pengguna melayang di kanan atas. */}
          <div className="flex items-center justify-between gap-3 lg:absolute lg:right-0 lg:top-0 lg:z-10">
            <div className="flex items-center gap-3 lg:hidden">
              <button type="button" className="icon-btn" aria-label="Buka menu" onClick={() => setOpen(true)}>
                <Menu size={20} />
              </button>
              <Brand compact />
            </div>
            <UserMenu user={user} />
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
