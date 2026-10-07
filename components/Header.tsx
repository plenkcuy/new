import { Bell, Settings } from "lucide-react";

export function Header() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-normal tracking-tight sm:text-4xl">
          Selamat datang, <span className="text-[var(--accent)]">Raka</span>
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Ringkasan portofolio investasimu hari ini</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="icon-btn" aria-label="Notifikasi">
          <Bell size={20} strokeWidth={1.6} />
        </button>
        <button className="icon-btn" aria-label="Pengaturan">
          <Settings size={20} strokeWidth={1.6} />
        </button>
        <div className="ml-2 flex items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-medium text-white"
            style={{ background: "linear-gradient(135deg,#14b8a6,#115e59)" }}
            aria-hidden
          >
            RA
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="text-sm">Raka Aditya</div>
            <div className="text-xs text-[var(--muted)]">raka@contoh.id</div>
          </div>
        </div>
      </div>
    </header>
  );
}
