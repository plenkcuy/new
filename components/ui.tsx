/**
 * Komponen presentasi kecil yang dipakai banyak halaman.
 * Tanpa state/hook, jadi bisa dipakai dari server maupun client component.
 */
import Link from "next/link";
import { Lock } from "lucide-react";
import { TIER_LABEL, deniedRedirect } from "@/lib/access";
import type { Tier } from "@/lib/shared";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="6" fill="#2dd4bf" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <line
              key={i}
              x1={(16 + Math.cos(a) * 10).toFixed(2)}
              y1={(16 + Math.sin(a) * 10).toFixed(2)}
              x2={(16 + Math.cos(a) * 14).toFixed(2)}
              y2={(16 + Math.sin(a) * 14).toFixed(2)}
              stroke="#2dd4bf"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <span className={`text-xl font-medium tracking-tight ${compact ? "hidden sm:inline" : ""}`}>Lumen Invest</span>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    // `lg:pr-80` menyisakan ruang untuk menu pengguna yang melayang di kanan atas (lihat app/[tab]/shell.tsx).
    <div className="flex flex-wrap items-end justify-between gap-4 lg:pr-80">
      <div>
        <h1 className="text-3xl font-normal tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "up" | "down";
}) {
  return (
    <div className="card p-5">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className={`mt-2 text-2xl font-medium tracking-tight ${tone ?? ""}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>}
    </div>
  );
}

/** Lingkaran berwarna dengan huruf pertama kode saham (pengganti logo emiten). */
export function SymbolDot({ symbol, color, size = 36 }: { symbol: string; color: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ background: color, width: size, height: size }}
      aria-hidden
    >
      {symbol[0]}
    </div>
  );
}

export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`badge badge-${tier}`}>{TIER_LABEL[tier]}</span>;
}

/**
 * Kartu pengganti untuk fitur yang terkunci. Dirender di SERVER sebagai ganti
 * konten aslinya, jadi konten/data premium tidak pernah dikirim ke pengguna Free.
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
