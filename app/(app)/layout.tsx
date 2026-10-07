import { AppShell } from "@/components/layout/AppShell";
import { UserMenu } from "@/components/layout/UserMenu";
import { requireSession } from "@/lib/auth/guards";

/**
 * Layout area aplikasi (semua rute yang butuh login).
 * Catatan: layout TIDAK dirender ulang saat pindah halaman, karena itu setiap
 * page tetap memanggil guard sendiri (requireSession / requireTier).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession();

  return (
    <AppShell tier={user.tier} actions={<UserMenu user={user} />}>
      {children}
    </AppShell>
  );
}
