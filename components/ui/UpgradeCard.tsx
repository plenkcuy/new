import Link from "next/link";
import { Lock } from "lucide-react";
import { deniedRedirect } from "@/lib/auth/access";
import type { Tier } from "@/lib/auth/types";

/**
 * Kartu pengganti untuk fitur yang terkunci. Dirender di SERVER sebagai ganti
 * konten aslinya, jadi konten/ data premium tidak pernah dikirim ke pengguna Free.
 */
export function UpgradeCard({
  title,
  description,
  from,
  required = "premium",
  glow = false,
  className = "",
}: {
  title: string;
  description: string;
  from?: string;
  required?: Tier;
  glow?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`${glow ? "card-glow" : "card"} flex flex-col items-center justify-center gap-4 p-6 text-center ${className}`}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full text-[var(--accent)]"
        style={{ background: "rgba(45,212,191,0.15)" }}
      >
        <Lock size={22} />
      </div>
      <div>
        <h2 className="text-lg">{title}</h2>
        <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-[var(--muted)]">{description}</p>
      </div>
      <Link href={deniedRedirect(required, from)} className="btn btn-primary">
        Upgrade ke Premium
      </Link>
    </section>
  );
}
