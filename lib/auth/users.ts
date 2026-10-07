import "server-only";
import type { User } from "./types";

/**
 * Repository pengguna. SAAT INI: data contoh di memori.
 * Ganti implementasi `userRepo` dengan query database (Prisma/Drizzle/Supabase)
 * tanpa mengubah kode lain, selama kontrak `UserRepository` dipenuhi.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  list(): Promise<User[]>;
}

const USERS: readonly User[] = [
  { id: "u_free", name: "Raka Aditya", email: "raka@lumen.example", tier: "free", status: "active", createdAt: "2026-03-14", lastActiveAt: "2026-10-07" },
  { id: "u_premium", name: "Maya Putri", email: "maya@lumen.example", tier: "premium", status: "active", createdAt: "2025-11-03", lastActiveAt: "2026-10-07" },
  { id: "u_admin", name: "Sinta Wijaya", email: "sinta@lumen.example", tier: "admin", status: "active", createdAt: "2025-06-20", lastActiveAt: "2026-10-07" },
  { id: "u_4", name: "Budi Santoso", email: "budi@lumen.example", tier: "free", status: "active", createdAt: "2026-05-02", lastActiveAt: "2026-10-05" },
  { id: "u_5", name: "Citra Lestari", email: "citra@lumen.example", tier: "premium", status: "active", createdAt: "2025-12-18", lastActiveAt: "2026-10-06" },
  { id: "u_6", name: "Dimas Pratama", email: "dimas@lumen.example", tier: "free", status: "suspended", createdAt: "2026-01-09", lastActiveAt: "2026-08-21" },
  { id: "u_7", name: "Eka Nugroho", email: "eka@lumen.example", tier: "premium", status: "active", createdAt: "2026-02-27", lastActiveAt: "2026-10-04" },
  { id: "u_8", name: "Fitri Handayani", email: "fitri@lumen.example", tier: "free", status: "active", createdAt: "2026-07-30", lastActiveAt: "2026-10-03" },
];

export const userRepo: UserRepository = {
  async findById(id) {
    return USERS.find((user) => user.id === id) ?? null;
  },
  async list() {
    return [...USERS];
  },
};

/** Hanya akun ini yang boleh dipakai lewat login demo. */
export const DEMO_USER_IDS = ["u_free", "u_premium", "u_admin"] as const;
