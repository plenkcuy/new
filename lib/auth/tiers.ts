import type { Tier } from "./types";

/** Urutan dari terendah ke tertinggi. Admin otomatis mencakup hak Premium. */
export const TIERS = ["free", "premium", "admin"] as const satisfies readonly Tier[];

const RANK: Record<Tier, number> = { free: 0, premium: 1, admin: 2 };

export const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  premium: "Premium",
  admin: "Admin",
};

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && (TIERS as readonly string[]).includes(value);
}

/** Apakah `current` memenuhi syarat minimal `required`? */
export function hasTier(current: Tier, required: Tier): boolean {
  return RANK[current] >= RANK[required];
}
