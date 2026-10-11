import "server-only";
import { userRepo } from "./auth";
import { PREMIUM_PRICE_IDR } from "./access";
import type { Post, Tier, User } from "./shared";

/**
 * Data tiruan yang tersisa: Komunitas (butuh sistem konten) dan ringkasan Admin
 * (butuh database pengguna). Pasar, watchlist, portofolio, dan analisis sudah memakai
 * data asli dari jurnal dan scraper (lihat lib/journal.ts dan lib/market-lists.ts).
 * Semua fungsi async agar mudah diganti dengan API atau database.
 */

/* ============================================================
 * Komunitas (konten tiruan, bukan saran investasi)
 * ============================================================ */

const POSTS: readonly Post[] = [
  {
    id: "p1",
    author: "Maya Putri",
    role: "Analis",
    time: "2 jam lalu",
    body: "Rilis kuartal terbaru sektor perbankan menunjukkan pertumbuhan kredit yang stabil. Menarik melihat bagaimana margin bunga bersih bergerak dalam beberapa kuartal ke depan.",
    likes: 42,
    replies: 9,
    tags: ["Perbankan", "Kuartalan"],
  },
  {
    id: "p2",
    author: "Citra Lestari",
    role: "Investor",
    time: "5 jam lalu",
    body: "Saya mulai mencatat alokasi per sektor setiap bulan. Ternyata porsi kas saya lebih besar dari yang saya kira. Ada yang punya template pencatatan yang praktis?",
    likes: 18,
    replies: 14,
    tags: ["Alokasi", "Pencatatan"],
  },
  {
    id: "p3",
    author: "Eka Nugroho",
    role: "Investor",
    time: "Kemarin",
    body: "Diskusi minggu ini: seberapa sering kalian meninjau ulang portofolio? Bulanan, kuartalan, atau hanya saat ada berita besar?",
    likes: 27,
    replies: 31,
    tags: ["Diskusi"],
  },
  {
    id: "p4",
    author: "Sinta Wijaya",
    role: "Analis",
    time: "2 hari lalu",
    body: "Pengingat: diversifikasi tidak menghilangkan risiko, tetapi dapat membantu menurunkan dampak satu emiten terhadap keseluruhan portofolio.",
    likes: 63,
    replies: 6,
    tags: ["Risiko", "Edukasi"],
  },
];

const TOPICS = [
  { tag: "Perbankan", posts: 128 },
  { tag: "Alokasi", posts: 96 },
  { tag: "Dividen", posts: 74 },
  { tag: "Edukasi", posts: 61 },
  { tag: "Risiko", posts: 45 },
];

export async function getPosts(): Promise<Post[]> {
  return [...POSTS];
}

export async function getTrendingTopics(): Promise<{ tag: string; posts: number }[]> {
  return [...TOPICS];
}

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
