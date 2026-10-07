import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/auth/actions";
import type { SessionUser } from "@/lib/auth/types";
import { TierBadge } from "@/components/ui/TierBadge";

export function UserMenu({ user }: { user: SessionUser }) {
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
