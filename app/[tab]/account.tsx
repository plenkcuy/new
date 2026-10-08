/** Tab akun: Pengaturan, Bantuan, Upgrade, dan Akses ditolak. Semua terbuka untuk setiap pengguna yang login. */
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { PageHeader, TierBadge } from "@/components/ui";
import { PREMIUM_PRICE_IDR, getPlanComparison, hasTier, limitsFor, safeNext } from "@/lib/access";
import { logout } from "@/lib/actions";
import { idr, type ScreenProps } from "@/lib/shared";

export async function SettingsScreen({ user }: ScreenProps) {
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

const FAQ = [
  {
    q: "Apa bedanya paket Free dan Premium?",
    a: "Free mencakup dashboard, portofolio, dan pasar dengan batas tertentu. Premium menambah Insight AI, analisis lanjutan, komunitas, ekspor CSV, rentang grafik penuh, dan feed real-time. Bandingkan lengkapnya di halaman Upgrade.",
  },
  {
    q: "Bagaimana cara upgrade ke Premium?",
    a: "Pembayaran otomatis belum terhubung pada versi demo ini. Hubungi tim kami lewat email di bawah dan paketmu akan diaktifkan.",
  },
  {
    q: "Apakah data di dashboard real-time?",
    a: "Belum. Seluruh data pada versi ini adalah data tiruan untuk demo tampilan dan tidak mencerminkan harga pasar sebenarnya.",
  },
  {
    q: "Bagaimana mengekspor portofolio?",
    a: "Pengguna Premium dapat mengunduh portofolio dalam format CSV dari halaman Portofolio.",
  },
];

export async function SupportScreen(_: ScreenProps) {
  return (
    <>
      <PageHeader title="Bantuan" subtitle="Pertanyaan umum dan cara menghubungi kami" />

      <section className="flex flex-col gap-3">
        {FAQ.map((item) => (
          <details key={item.q} className="card p-5 [&_summary]:cursor-pointer">
            <summary className="text-sm">{item.q}</summary>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{item.a}</p>
          </details>
        ))}
      </section>

      <section className="card p-6">
        <h2 className="text-lg">Hubungi kami</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Email:{" "}
          <a className="text-[var(--accent)] underline-offset-4 hover:underline" href="mailto:support@lumen.example">
            support@lumen.example
          </a>
        </p>
      </section>
    </>
  );
}

export async function UpgradeScreen({ user, query }: ScreenProps) {
  const from = safeNext(query.from, "");
  const isPremium = hasTier(user.tier, "premium");
  const rows = getPlanComparison();

  return (
    <>
      <PageHeader title="Paket & Upgrade" subtitle="Pilih paket yang sesuai kebutuhan investasimu" />

      {from && !isPremium && (
        <div className="card p-5 text-sm">
          Halaman <code className="text-[var(--accent)]">{from.split("?")[0]}</code> membutuhkan paket Premium.
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

export async function ForbiddenScreen(_: ScreenProps) {
  return (
    <div className="card mx-auto mt-10 flex max-w-md flex-col items-center gap-4 p-10 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full text-[var(--down)]"
        style={{ background: "rgba(248,113,113,0.12)" }}
      >
        <ShieldAlert size={26} />
      </div>
      <h1 className="text-2xl">Akses ditolak</h1>
      <p className="text-sm text-[var(--muted)]">
        Halaman ini hanya untuk Admin. Akunmu tidak memiliki izin untuk membukanya.
      </p>
      <Link href="/dashboard" className="btn btn-primary">
        Kembali ke dashboard
      </Link>
    </div>
  );
}

/** Dipetakan ke tab di page.tsx. */
export const AccountScreens = {
  settings: SettingsScreen,
  support: SupportScreen,
  upgrade: UpgradeScreen,
  forbidden: ForbiddenScreen,
};
