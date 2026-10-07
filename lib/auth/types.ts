/** Tipe inti autentikasi. Hanya tipe (tanpa kode runtime), aman diimpor dari mana saja. */

export type Tier = "free" | "premium" | "admin";
export type UserStatus = "active" | "suspended";

export type User = {
  id: string;
  name: string;
  email: string;
  tier: Tier;
  status: UserStatus;
  /** Tanggal ISO (YYYY-MM-DD). */
  createdAt: string;
  lastActiveAt: string;
};

/** Data pengguna yang aman dibagikan ke UI. */
export type SessionUser = Pick<User, "id" | "name" | "email" | "tier">;

/** Isi cookie sesi yang ditandatangani. `exp` dalam detik Unix. */
export type SessionPayload = {
  sub: string;
  tier: Tier;
  exp: number;
};
