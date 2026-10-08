import Link from "next/link";
import { PageHeader, StatCard, TierBadge } from "@/components/ui";
import { TIERS, TIER_LABEL, isTier } from "@/lib/access";
import { getAdminOverview, getUsers } from "@/lib/data";
import { formatDate, idr, type ScreenProps, type Tier } from "@/lib/shared";

export async function AdminScreen({ query }: ScreenProps) {
  const filter: Tier | "all" = isTier(query.tier) ? query.tier : "all";
  const [overview, users] = await Promise.all([getAdminOverview(), getUsers(filter)]);

  const filters: { value: Tier | "all"; label: string }[] = [
    { value: "all", label: "Semua" },
    ...TIERS.map((t) => ({ value: t, label: TIER_LABEL[t] })),
  ];

  return (
    <>
      <PageHeader title="Admin" subtitle="Ringkasan pengguna dan kesehatan sistem" />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total pengguna" value={overview.total} hint={`${overview.suspended} dibekukan`} />
        <StatCard label="Pengguna Free" value={overview.byTier.free} />
        <StatCard label="Pengguna Premium" value={overview.byTier.premium} />
        <StatCard label="Estimasi MRR" value={idr(overview.mrr)} hint="Dari jumlah pengguna Premium" />
      </div>

      <section className="card p-6">
        <h2 className="text-lg">Kesehatan sistem</h2>
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {overview.health.map((h) => (
            <li key={h.label} className="flex items-center justify-between py-3 text-sm">
              <span className="text-[var(--muted)]">{h.label}</span>
              <span className={h.ok ? "up" : "down"}>{h.value}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-[var(--muted)]">Data tiruan. Sambungkan ke sistem monitoring sungguhan.</p>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg">Pengguna ({users.length})</h2>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <Link
                key={f.value}
                href={f.value === "all" ? "/admin" : `/admin?tier=${f.value}`}
                className="pill"
                data-active={filter === f.value}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pengguna</th>
                <th>Paket</th>
                <th>Status</th>
                <th>Bergabung</th>
                <th>Terakhir aktif</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div>{u.name}</div>
                    <div className="text-[11px] text-[var(--muted)]">{u.email}</div>
                  </td>
                  <td>
                    <TierBadge tier={u.tier} />
                  </td>
                  <td className={u.status === "active" ? "up" : "down"}>
                    {u.status === "active" ? "Aktif" : "Dibekukan"}
                  </td>
                  <td className="text-[var(--muted)]">{formatDate(u.createdAt)}</td>
                  <td className="text-[var(--muted)]">{formatDate(u.lastActiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-[var(--muted)]">
          Tampilan hanya-baca. Untuk ubah paket atau bekukan akun, tambahkan server action yang memanggil
          requireFeature(&quot;admin-panel&quot;).
        </p>
      </section>
    </>
  );
}
