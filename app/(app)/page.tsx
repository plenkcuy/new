import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { TierBadge } from "@/components/ui/TierBadge";
import { safeNext } from "@/lib/auth/access";
import { requireSession } from "@/lib/auth/guards";
import { hasTier } from "@/lib/auth/tiers";
import { idr } from "@/lib/format";
import { PREMIUM_PRICE_IDR, getPlanComparison } from "@/lib/plans";

export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { user } = await requireSession();
  const { from: rawFrom } = await searchParams;
  const from = safeNext(rawFrom, "");
  const isPremium = hasTier(user.tier, "premium");
  const rows = getPlanComparison();

  return (
    <>
      <PageHeader title="Paket & Upgrade" subtitle="Pilih paket yang sesuai kebutuhan investasimu" />

      {from && !isPremium && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
          <span>
            Halaman <code className="text-[var(--accent)]">{from.split("?")[0]}</code> membutuhkan paket Premium.
          </span>
        </div>
      )}

      <section className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fitur</th>
              <th className="num">
                Free {user.tier === "free" && <span className="badge badge-free ml-2">Paketmu</span>}
              </th>
              <th className="num">
                Premium {isPremium && <span className="badge badge-premium ml-2">Paketmu</span>}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="num text-[var(--muted)]">{row.free}</td>
                <td className="num">{row.premium}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card-glow flex flex-wrap items-center justify-between gap-4 p-6">
        {isPremium ? (
          <>
            <div>
              <h2 className="text-lg">Kamu sudah memiliki akses Premium</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Paket aktif: <TierBadge tier={user.tier} />
              </p>
            </div>
            <Link href={from || "/dashboard"} className="btn btn-primary">
              Kembali
            </Link>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-lg">Premium · {idr(PREMIUM_PRICE_IDR)} / bulan</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Harga contoh. Pembayaran otomatis belum terhubung, hubungi kami untuk mengaktifkan.
              </p>
            </div>
            <Link href="/support" className="btn btn-primary">
              Hubungi kami
            </Link>
          </>
        )}
      </section>
    </>
  );
}
