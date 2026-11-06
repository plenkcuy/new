import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { can, deniedRedirect, limitsFor } from "@/lib/access";
import { getCalendar } from "@/lib/journal";
import type { Ccy, ScreenProps } from "@/lib/shared";
import { CalendarView } from "./calendar-view";
import { EconomicCalendarView } from "./economic-calendar";

export async function CalendarScreen({ user, query }: ScreenProps) {
  const view = query.view === "ekonomi" ? "ekonomi" : "jurnal";
  const report: Ccy = query.ccy === "USD" ? "USD" : "IDR";

  const header = (
    <PageHeader
      title="Kalender"
      subtitle={view === "ekonomi" ? "Rilis ekonomi AS dan dampaknya ke kripto dan saham" : "Untung rugi terealisasi per hari dari jurnalmu"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/calendar" className="pill" data-active={view === "jurnal"}>
          Jurnal
        </Link>
        <Link href="/calendar?view=ekonomi" className="pill" data-active={view === "ekonomi"}>
          Kalender ekonomi
        </Link>
        {view === "jurnal" &&
          (["IDR", "USD"] as const).map((c) => (
            <Link key={c} href={c === "USD" ? "/calendar?ccy=USD" : "/calendar"} className="pill" data-active={report === c}>
              {c}
            </Link>
          ))}
      </div>
    </PageHeader>
  );

  if (view === "ekonomi") {
    if (!can(user.tier, "economic-calendar")) {
      return (
        <>
          {header}
          <section className="card flex flex-col gap-3 p-6 text-sm leading-relaxed">
            <p className="text-base font-medium">Kalender ekonomi khusus Premium</p>
            <p className="text-[var(--muted)]">
              Kalender ekonomi menunjukkan rilis data AS beserta perkiraan dampaknya ke kripto dan saham. Fitur ini tersedia di paket Premium.
            </p>
            <Link href={deniedRedirect("premium", "/calendar?view=ekonomi")} className="btn btn-primary w-fit">
              Lihat paket Premium
            </Link>
          </section>
        </>
      );
    }
    return (
      <>
        {header}
        <EconomicCalendarView filterParam={query.dampak} />
      </>
    );
  }

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

  const limits = limitsFor(user.tier);
  const data = await getCalendar({ userId: user.id, report, months: limits.calendarMonths });

  return (
    <>
      {header}
      <div className="w-full">
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
