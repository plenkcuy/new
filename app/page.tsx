import { redirect } from "next/navigation";
import { Brand } from "@/components/layout/Brand";
import { TierBadge } from "@/components/ui/TierBadge";
import { safeNext } from "@/lib/auth/access";
import { getAuthSecret, isDemoAuthEnabled } from "@/lib/auth/config";
import { loginDemo } from "@/lib/auth/actions";
import { getSession } from "@/lib/auth/session";
import { DEMO_USER_IDS, userRepo } from "@/lib/auth/users";

const DEMO_NOTES: Record<(typeof DEMO_USER_IDS)[number], string> = {
  u_free: "Dashboard, portofolio, dan pasar dengan batas jatah.",
  u_premium: "Semua fitur analisis, komunitas, dan ekspor.",
  u_admin: "Semua fitur Premium ditambah panel admin.",
};

const ERRORS: Record<string, string> = {
  invalid: "Akun demo tidak valid atau sedang dibekukan.",
  disabled: "Login demo dinonaktifkan di lingkungan ini.",
  config: "AUTH_SECRET belum diatur. Isi minimal 32 karakter di environment variable.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNext(rawNext);

  // Keputusan "sudah login?" diambil di sini (sesi otoritatif), bukan di middleware.
  if (await getSession()) redirect(next);

  const demoEnabled = isDemoAuthEnabled();
  const configured = getAuthSecret() !== null;
  const users = await Promise.all(DEMO_USER_IDS.map((id) => userRepo.findById(id)));
  const message = error ? ERRORS[error] : !configured ? ERRORS.config : null;

  return (
    <div className="card w-full max-w-md p-8">
      <Brand />
      <h1 className="mt-8 text-2xl">Masuk</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">Pilih akun demo untuk mencoba tiap tingkat akses.</p>

      {message && (
        <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
          {message}
        </div>
      )}

      {demoEnabled ? (
        <div className="mt-6 flex flex-col gap-3">
          {users.map((user) =>
            user ? (
              <form key={user.id} action={loginDemo}>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="next" value={next} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--card-soft)] p-4 text-left transition hover:border-white/30"
                >
                  <div>
                    <div className="text-sm">{user.name}</div>
                    <div className="mt-1 text-[11px] text-[var(--muted)]">
                      {DEMO_NOTES[user.id as (typeof DEMO_USER_IDS)[number]]}
                    </div>
                  </div>
                  <TierBadge tier={user.tier} />
                </button>
              </form>
            ) : null,
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">
            Mode demo: bukan autentikasi produksi. Ganti dengan login sungguhan sebelum dipakai pengguna nyata (lihat README).
          </p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-[var(--muted)]">
          Login demo nonaktif. Hubungkan penyedia autentikasi sungguhan (lihat README) atau set DEMO_AUTH=true untuk pratinjau.
        </p>
      )}
    </div>
  );
}
