"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-4 p-10 text-center">
      <h2 className="text-xl">Terjadi kesalahan</h2>
      <p className="max-w-sm text-sm text-[var(--muted)]">
        Halaman ini gagal dimuat. Coba lagi, dan jika masih terjadi, hubungi tim dukungan.
      </p>
      <button type="button" className="btn btn-primary" onClick={reset}>
        Coba lagi
      </button>
    </div>
  );
}
