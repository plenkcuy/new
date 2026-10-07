import {
  BarChart3,
  Briefcase,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

/**
 * Daftar menu sidebar. Tier minimum TIDAK ditulis di sini, melainkan diambil dari
 * `requiredTierFor(href)` (lib/auth/access.ts) supaya satu sumber kebenaran.
 */
export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

export const NAV_MAIN: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portofolio", icon: Briefcase },
  { href: "/analysis", label: "Analisis", icon: BarChart3 },
  { href: "/market", label: "Pasar", icon: LineChart },
  { href: "/community", label: "Komunitas", icon: Users },
];

/** Hanya ditampilkan untuk Admin. */
export const NAV_ADMIN: NavItem[] = [
  { href: "/admin", label: "Ringkasan", icon: ShieldCheck, exact: true },
  { href: "/admin/users", label: "Pengguna", icon: UsersRound },
];

export const NAV_FOOTER: NavItem[] = [
  { href: "/settings", label: "Pengaturan", icon: Settings },
  { href: "/support", label: "Bantuan", icon: LifeBuoy },
];
