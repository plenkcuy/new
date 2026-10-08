/**
 * Router tab: SATU halaman melayani semua menu (/dashboard, /portfolio, ...).
 *
 * Menambah tab baru:
 *   1. buat layar baru (fungsi `XScreen`) di file tab yang sesuai,
 *   2. daftarkan di SCREENS di bawah,
 *   3. (opsional) tambahkan aturan tier di ROUTE_RULES (lib/access.ts) dan menu di shell.tsx.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requiredTierFor } from "@/lib/access";
import { requireTier } from "@/lib/auth";
import type { Query, ScreenProps } from "@/lib/shared";
import { AccountScreens } from "./account";
import { AdminScreen } from "./admin";
import { DashboardScreen } from "./dashboard";
import { MarketScreen } from "./market";
import { PortfolioScreen } from "./portfolio";
import { AnalysisScreen, CommunityScreen } from "./premium";

type Screen = { title: string; render: (props: ScreenProps) => Promise<React.ReactNode> };

const SCREENS: Record<string, Screen> = {
  dashboard: { title: "Dashboard", render: DashboardScreen },
  portfolio: { title: "Portofolio", render: PortfolioScreen },
  market: { title: "Pasar", render: MarketScreen },
  analysis: { title: "Analisis", render: AnalysisScreen },
  community: { title: "Komunitas", render: CommunityScreen },
  admin: { title: "Admin", render: AdminScreen },
  settings: { title: "Pengaturan", render: AccountScreens.settings },
  support: { title: "Bantuan", render: AccountScreens.support },
  upgrade: { title: "Upgrade", render: AccountScreens.upgrade },
  forbidden: { title: "Akses ditolak", render: AccountScreens.forbidden },
};

/** Hanya kunci milik sendiri (cegah "constructor", "__proto__", dst). */
function findScreen(tab: string): Screen | null {
  return Object.prototype.hasOwnProperty.call(SCREENS, tab) ? SCREENS[tab] : null;
}

type Props = {
  params: Promise<{ tab: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tab } = await params;
  return { title: findScreen(tab)?.title ?? "Tidak ditemukan" };
}

export default async function TabPage({ params, searchParams }: Props) {
  const { tab } = await params;
  const screen = findScreen(tab);
  if (!screen) return notFound();

  // Guard TERPUSAT: tier minimum diambil dari ROUTE_RULES (sama dengan middleware dan sidebar).
  const path = `/${tab}`;
  const { user } = await requireTier(requiredTierFor(path), path);

  const raw = await searchParams;
  const query: Query = {};
  for (const [key, value] of Object.entries(raw)) query[key] = Array.isArray(value) ? value[0] : value;

  return screen.render({ user, query });
}
