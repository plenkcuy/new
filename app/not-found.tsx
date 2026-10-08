import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-6xl font-light text-[var(--accent)]">404</div>
      <h1 className="text-2xl">Halaman tidak ditemukan</h1>
      <p className="text-sm text-[var(--muted)]">Alamat yang kamu buka tidak ada atau sudah dipindahkan.</p>
      <Link href="/dashboard" className="btn btn-primary">
        Ke dashboard
      </Link>
    </div>
  );
}
