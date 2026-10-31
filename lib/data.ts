import "server-only";
import { userRepo } from "./auth";
import { PREMIUM_PRICE_IDR } from "./access";
import type { Tier, User } from "./shared";

/**
 * Data tiruan yang tersisa: ringkasan Admin (butuh database pengguna). Pasar, watchlist, portofolio, dan analisis sudah memakai
 * data asli dari jurnal dan scraper (lihat lib/journal.ts dan lib/market-lists.ts).
 * Semua fungsi async agar mudah diganti dengan API atau database.
 */

/* ============================================================
 * Admin
 * ============================================================ */

export async function getUsers(filter: Tier | "all" = "all"): Promise<User[]> {
  const users = await userRepo.list();
  return filter === "all" ? users : users.filter((user) => user.tier === filter);
}

export type AdminOverview = {
  total: number;
  byTier: Record<Tier, number>;
  suspended: number;
  /** Estimasi pendapatan bulanan berulang dari jumlah pengguna Premium. */
  mrr: number;
  health: { label: string; value: string; ok: boolean }[];
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const users = await userRepo.list();
  const byTier: Record<Tier, number> = { free: 0, premium: 0, admin: 0 };
  for (const user of users) byTier[user.tier] += 1;

  return {
    total: users.length,
    byTier,
    suspended: users.filter((user) => user.status === "suspended").length,
    mrr: byTier.premium * PREMIUM_PRICE_IDR,
    // Data tiruan. Sambungkan ke monitoring sungguhan (Grafana/Datadog/dsb).
    health: [
      { label: "Latensi API (p95)", value: "142 ms", ok: true },
      { label: "Tingkat error (24 jam)", value: "0,12%", ok: true },
      { label: "Antrean job", value: "3 menunggu", ok: true },
      { label: "Uptime (30 hari)", value: "99,97%", ok: true },
    ],
  };
}
