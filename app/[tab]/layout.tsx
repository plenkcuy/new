import { cookies } from "next/headers";
import { AppShell } from "./shell";
import { requireSession } from "@/lib/auth";

/**
 * Layout area aplikasi (semua tab; wajib login).
 * Catatan: layout TIDAK dirender ulang saat pindah halaman, karena itu guard tier dijalankan
 * di page.tsx setiap kali tab dirender.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession();
  const collapsed = (await cookies()).get("lumen_sidebar")?.value === "1";
  return (
    <AppShell user={user} defaultCollapsed={collapsed}>
      {children}
    </AppShell>
  );
}
