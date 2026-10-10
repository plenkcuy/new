import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { deniedRedirect, limitsFor } from "@/lib/access";
import { getCalendar } from "@/lib/journal";
import type { Ccy, ScreenProps } from "@/lib/shared";
import { CalendarView } from "./calendar-view";

export async function CalendarScreen({ user, query }: ScreenProps) {
  const limits = limitsFor(user.tier);
  const report: Ccy = query.ccy === "USD" ? "USD" : "IDR";

  const header = (
    <PageHeader title="Kalender" subtitle="Untung rugi terealisasi per hari dari jurnalmu">
      <div className="flex flex-wrap items-center gap-2">
        {(["IDR", "USD"] as const).map((c) => (
          <Link key={c} href={c === "USD" ? "/calendar?ccy=USD" : "/calendar"} className="pill" data-active={report === c}>
            {c}
          </Link>
        ))}
      </div>
    </PageHeader>
  );

  if (!process.env.DATABASE_URL) {
    return (
      <>
        {header}
        <section className="card p-6 text-sm leading-relaxed text-[var(--muted)]">
          Database belum terhubung. Isi <code className="text-[var(--accent)]">DATABASE_URL</code> dengan connection string Neon,
          lalu jalankan <code className="text-[var(--accent)]">db/001_journal.sql</code> sekali di Neon.
        </section>
      </>
    );
  }

  const data = await getCalendar({ userId: user.id, report, months: limits.calendarMonths });

  return (
    <>
      {header}
      <div className="mx-auto w-full max-w-[640px]">
        <CalendarView
          days={data.days}
          report={report}
          todayKey={data.todayKey}
          minMonth={data.minMonth}
          maxMonth={data.maxMonth}
          limited={data.limited}
          upgradeHref={deniedRedirect("premium", "/calendar")}
        />
      </div>
      <p className="text-xs text-[var(--muted)]">Catatan jurnal, bukan saran investasi.</p>
    </>
  );
}
