import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { requireSession } from "@/lib/auth/guards";

export default async function ForbiddenPage() {
  await requireSession();

  return (
    <div className="card mx-auto mt-10 flex max-w-md flex-col items-center gap-4 p-10 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full text-[var(--down)]"
        style={{ background: "rgba(248,113,113,0.12)" }}
      >
        <ShieldAlert size={26} />
      </div>
      <h1 className="text-2xl">Akses ditolak</h1>
      <p className="text-sm text-[var(--muted)]">Halaman ini hanya untuk Admin. Akunmu tidak memiliki izin untuk membukanya.</p>
      <Link href="/dashboard" className="btn btn-primary">
        Kembali ke dashboard
      </Link>
    </div>
  );
}
