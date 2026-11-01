"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
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
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
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
type NavGroup = { id: string; label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "aset",
    label: "Aset Saya",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/portfolio", label: "Portofolio", icon: Briefcase },
      { href: "/journal", label: "Jurnal", icon: BookOpen },
      { href: "/calendar", label: "Kalender", icon: CalendarDays },
    ],
  },
  {
    id: "riset",
    label: "Riset Pasar",
    items: [
      { href: "/analysis", label: "Analisis", icon: BarChart3 },
      { href: "/futures", label: "Futures", icon: Activity },
      { href: "/market", label: "Pasar", icon: LineChart },
    ],
  },
];
/** Hanya ditampilkan untuk Admin. */
const NAV_ADMIN: NavGroup = {
  id: "admin",
  label: "Pengelola",
  items: [{ href: "/admin", label: "Admin", icon: ShieldCheck }],
};
const NAV_FOOTER: NavItem[] = [
  { href: "/settings", label: "Pengaturan", icon: Settings },
  { href: "/support", label: "Bantuan", icon: LifeBuoy },
];

const SIDEBAR_ID = "sidebar";

function Sidebar({
  tier,
  open,
  collapsed,
  onToggleCollapse,
  onClose,
  panelRef,
  closeRef,
}: {
  tier: Tier;
  open: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onClose: (returnFocus: boolean) => void;
  panelRef: React.Ref<HTMLDivElement>;
  closeRef: React.Ref<HTMLButtonElement>;
}) {
  const pathname = usePathname();
  const groups = hasTier(tier, "admin") ? [...NAV_GROUPS, NAV_ADMIN] : NAV_GROUPS;
  // Mode ikon hanya berlaku di desktop. Di layar kecil drawer selalu penuh.
  const rail = collapsed ? "lg:justify-center lg:px-0" : "";
  const hideLabel = collapsed ? "lg:sr-only" : "";

  const renderItem = (item: NavItem) => {
    const required = requiredTierFor(item.href);
    const locked = !hasTier(tier, required);
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;

    return (
      <li key={item.href}>
        <Link
          // Menu terkunci langsung menuju halaman upgrade (tanpa redirect tambahan).
          href={locked ? deniedRedirect(required, item.href) : item.href}
          className={`nav-item relative ${rail}`}
          data-active={active}
          data-rail={collapsed}
          data-tip={locked ? `${item.label} (Pro)` : item.label}
          aria-current={active ? "page" : undefined}
          onClick={() => onClose(false)}
        >
          <Icon size={20} strokeWidth={1.6} aria-hidden />
          <span className={hideLabel}>{item.label}</span>
          {locked && (
            <>
              <span className={`ml-auto inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] ${hideLabel}`}>
                <Lock size={12} aria-hidden /> PRO
              </span>
              {collapsed && <Lock size={11} aria-hidden className="absolute right-2 top-2 hidden text-[var(--accent)] lg:block" />}
            </>
          )}
        </Link>
      </li>
    );
  };

  return (
    <div
      id={SIDEBAR_ID}
      ref={panelRef}
      role={open ? "dialog" : undefined}
      aria-modal={open ? true : undefined}
      aria-label={open ? "Menu navigasi" : undefined}
      className={[
        "card fixed inset-y-3 left-3 z-50 flex w-[280px] max-w-[85vw] flex-col overflow-y-auto p-4",
        "transition-[transform,visibility] duration-300 ease-out",
        open ? "visible translate-x-0" : "invisible -translate-x-[115%]",
        "lg:visible lg:static lg:z-auto lg:w-auto lg:max-w-none lg:translate-x-0 lg:overflow-visible",
      ].join(" ")}
    >
      <nav aria-label="Navigasi utama" className="flex flex-col">
        <div className={`flex items-center justify-between px-3 pb-8 pt-4 ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
          <Link href="/dashboard" aria-label="Lumen Invest, ke dashboard" className="rounded-xl" onClick={() => onClose(false)}>
            <Brand iconOnlyLg={collapsed} />
          </Link>
          <button
            ref={closeRef}
            type="button"
            className="icon-btn h-10! w-10! lg:hidden"
            aria-label="Tutup menu"
            onClick={() => onClose(true)}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {groups.map((group, index) => (
            <div key={group.id}>
              {index > 0 && collapsed && <div aria-hidden className="mb-6 hidden h-px bg-white/10 lg:block" />}
              <p id={`nav-${group.id}`} className={`nav-group-label ${hideLabel}`}>
                {group.label}
              </p>
              <ul aria-labelledby={`nav-${group.id}`} className="mt-2 flex flex-col gap-1.5">
                {group.items.map(renderItem)}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <nav aria-label="Pengaturan dan bantuan" className="mt-auto pb-2 pt-6">
        <ul className="flex flex-col gap-1">
          <li className="hidden lg:block">
            <button
              type="button"
              className={`nav-item relative ${rail}`}
              data-rail={collapsed}
              data-tip={collapsed ? "Lebarkan menu" : "Perkecil menu"}
              aria-expanded={!collapsed}
              aria-controls={SIDEBAR_ID}
              onClick={onToggleCollapse}
            >
              {collapsed ? <PanelLeftOpen size={20} strokeWidth={1.6} aria-hidden /> : <PanelLeftClose size={20} strokeWidth={1.6} aria-hidden />}
              <span className={hideLabel}>{collapsed ? "Lebarkan menu" : "Perkecil menu"}</span>
            </button>
          </li>
          {NAV_FOOTER.map(renderItem)}
        </ul>
      </nav>
    </div>
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
      <Link href="/settings" className="flex items-center gap-3 rounded-full" aria-label={`Buka pengaturan akun ${user.name}`}>
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
          <LogOut size={20} strokeWidth={1.6} aria-hidden />
        </button>
      </form>
    </div>
  );
}

const SIDEBAR_COOKIE = "lumen_sidebar";

export function AppShell({
  user,
  children,
  defaultCollapsed = false,
}: {
  user: SessionUser;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const menuRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  const close = useCallback((returnFocus: boolean) => {
    restoreFocus.current = returnFocus;
    setOpen(false);
  }, []);

  // Pilihan disimpan di cookie (bukan localStorage) supaya server bisa merender lebar yang benar sejak paint pertama.
  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  };

  // Drawer terbuka: fokus pindah ke tombol tutup. Saat ditutup lewat Esc atau tombol tutup, fokus kembali ke tombol menu.
  useEffect(() => {
    if (open) {
      // Di awal transisi sidebar masih `visibility: hidden` dan belum bisa difokuskan, jadi dicoba lagi tiap frame sampai berhasil.
      let frame = 0;
      let tries = 0;
      const attempt = () => {
        closeRef.current?.focus();
        if (document.activeElement !== closeRef.current && tries++ < 20) frame = requestAnimationFrame(attempt);
      };
      frame = requestAnimationFrame(attempt);
      return () => cancelAnimationFrame(frame);
    }
    if (restoreFocus.current) {
      restoreFocus.current = false;
      menuRef.current?.focus();
    }
  }, [open]);

  // Esc menutup drawer, Tab berputar di dalam drawer, dan scroll halaman dikunci selama drawer terbuka.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close(true);
        return;
      }
      if (e.key !== "Tab") return;
      const found = panelRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      const nodes = found ? Array.from(found).filter((n) => n.getClientRects().length > 0) : [];
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  // Layar melebar ke desktop: sidebar sudah permanen, jadi drawer dan kunci scroll dilepas.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (query.matches) setOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] p-3 sm:p-5">
      <a href="#konten" className="skip-link">
        Lewati ke konten utama
      </a>

      {/* Jangan pakai backdrop-filter di pembungkus ini: itu membuat elemen `fixed`
          (drawer) berpatokan ke pembungkus, bukan ke layar. */}
      <div
        className="grid gap-6 rounded-[32px] border border-white/5 bg-white/[0.04] p-3 sm:p-6 lg:grid-cols-[var(--sb)_1fr] lg:transition-[grid-template-columns] lg:duration-300"
        style={{ "--sb": collapsed ? "84px" : "250px" } as React.CSSProperties}
      >
        {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => close(true)} aria-hidden />}

        <Sidebar
          tier={user.tier}
          open={open}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          onClose={close}
          panelRef={panelRef}
          closeRef={closeRef}
        />

        <div className="relative flex min-w-0 flex-col gap-6">
          {/* Mobile: baris atas biasa. Desktop: menu pengguna melayang di kanan atas. */}
          <header
            inert={open}
            className="flex items-center justify-between gap-3 lg:absolute lg:right-0 lg:top-0 lg:z-10"
          >
            <div className="flex items-center gap-3 lg:hidden">
              <button
                ref={menuRef}
                type="button"
                className="icon-btn"
                aria-label="Buka menu"
                aria-expanded={open}
                aria-controls={SIDEBAR_ID}
                onClick={() => setOpen(true)}
              >
                <Menu size={20} aria-hidden />
              </button>
              <Brand compact />
            </div>
            <UserMenu user={user} />
          </header>

          <main id="konten" tabIndex={-1} inert={open} className="flex min-w-0 flex-col gap-6 outline-none">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
