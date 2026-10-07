import { TIER_LABEL } from "@/lib/auth/tiers";
import type { Tier } from "@/lib/auth/types";

export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`badge badge-${tier}`}>{TIER_LABEL[tier]}</span>;
}
