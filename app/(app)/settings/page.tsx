import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { TierBadge } from "@/components/ui/TierBadge";
import { logout } from "@/lib/auth/actions";
import { requireSession } from "@/lib/auth/guards";
import { hasTier } from "@/lib/auth/tiers";
import { limitsFor } from "@/lib/plans";

export default async function SettingsPage() {
  const { user } = await requireSession();
  const limits = limitsFor(user.tier);
  const isPremium = hasTier(user.tier, "premium");

  return (
    <>
      <PageHeader title="Pengaturan" subtitle="Akun dan paket langgananmu" />

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-lg">Profil</h2>
          <dl className="mt-5 grid grid-cols-[120px_1fr] gap-y-4 text-sm">
            <dt className="text-[var(--muted)]">Nama</dt>
            <dd>{user.name}</dd>
            <dt className="text-[var(--muted)]">Email</dt>
            <dd className="break-all">{user.email}</dd>
            <dt className="text-[var(--muted)]">Paket</dt>
            <dd>
              <TierBadge tier={user.tier} />
            </dd>
          </dl>

          <form action={logout} className="mt-6">
            <button type="submit" className="btn btn-ghost">
              Keluar
            </button>
          </form>
        </section>

        <section className="card p-6">
          <h2 className="text-lg">Jatah paket kamu</h2>
          <ul className="mt-5 flex flex-col gap-3 text-sm">
            <li className="flex justify-between">
              <span className="text-[var(--muted)]">Saham di watchlist</span>
              <span>{limits.watchlistItems}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-[var(--muted)]">Rentang grafik</span>
              <span>{limits.chartRanges.join(", ")}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-[var(--muted)]">Feed pasar</span>
              <span>{limits.marketFeed === "realtime" ? "Real-time" : "Tertunda"}</span>
            </li>
          </ul>

          {!isPremium && (
            <Link href="/upgrade" className="btn btn-primary mt-6">
              Lihat paket Premium
            </Link>
          )}
        </section>
      </div>
    </>
  );
}
