import Link from "next/link";
import { loadEconomicCalendar } from "@/lib/economic-calendar/load";
import { toWib, type EconEvent, type ImpactLevel } from "@/lib/economic-calendar/model";

type Filter = "berdampak" | "kripto" | "saham" | "semua";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "berdampak", label: "Berdampak tinggi" },
  { id: "kripto", label: "Dampak kripto" },
  { id: "saham", label: "Dampak saham" },
  { id: "semua", label: "Semua" },
];

const LEVEL_LABEL: Record<ImpactLevel, string> = { critical: "Kritis", high: "Tinggi", medium: "Sedang", low: "Rendah", info: "Info" };
const LEVEL_CLASS: Record<ImpactLevel, string> = {
  critical: "bg-[color-mix(in_srgb,var(--down)_22%,transparent)] text-[var(--down)]",
  high: "bg-[color-mix(in_srgb,var(--down)_12%,transparent)] text-[var(--down)]",
  medium: "bg-white/10 text-[var(--text)]",
  low: "bg-white/10 text-[var(--muted)]",
  info: "bg-white/5 text-[var(--muted)]",
};
const IMPORTANCE_LABEL = { HIGH: "Tinggi", MEDIUM: "Sedang", LOW: "Rendah", INFO: "Info" } as const;

const WINDOW_BACK_DAYS = 1;
const WINDOW_FORWARD_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const isFilter = (v: unknown): v is Filter => typeof v === "string" && FILTERS.some((f) => f.id === v);

function matches(e: EconEvent, filter: Filter): boolean {
  switch (filter) {
    case "berdampak":
      return e.importance === "HIGH" || e.crypto.level === "critical" || e.crypto.level === "high";
    case "kripto":
      return e.crypto.level !== "info";
    case "saham":
      return e.stockAssets.length > 0;
    case "semua":
      return true;
  }
}

function dayLabel(date: string, todayKey: string): string {
  const base = date === todayKey ? "Hari ini" : date === shiftKey(todayKey, 1) ? "Besok" : "";
  const fmt = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" }).format(
    new Date(`${date}T12:00:00+07:00`),
  );
  return base ? `${base}, ${fmt}` : fmt;
}

/** Tanggal WIB ditambah n hari, dalam format YYYY-MM-DD. */
function shiftKey(key: string, days: number): string {
  const ms = Date.parse(`${key}T12:00:00+07:00`) + days * DAY_MS;
  return toWib(ms).date;
}

function EventCard({ e }: { e: EconEvent }) {
  const hasValues = e.actual || e.previous || e.consensus;
  return (
    <li className="flex min-w-0 flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium tabular-nums">{e.wibTime ?? "Tanpa jam"} WIB</span>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-[var(--muted)]">Rilis {IMPORTANCE_LABEL[e.importance]}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${LEVEL_CLASS[e.crypto.level]}`}>Kripto {LEVEL_LABEL[e.crypto.level]}</span>
      </div>

      <h3 className="text-base leading-snug">{e.name}</h3>

      {hasValues && (
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-xs text-[var(--muted)]">Actual</dt>
            <dd className="tabular-nums">{e.actual || "Belum rilis"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Perkiraan</dt>
            <dd className="tabular-nums">{e.consensus || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Sebelumnya</dt>
            <dd className="tabular-nums">{e.previous || "-"}</dd>
          </div>
        </dl>
      )}

      {e.crypto.level !== "info" && (
        <div className="flex flex-col gap-1.5 rounded-2xl border border-[var(--line)] bg-white/5 p-3 text-sm">
          <div className="font-medium">{e.crypto.direction}</div>
          <p className="text-[var(--muted)]">{e.crypto.reason}</p>
          <div className="text-xs text-[var(--muted)]">Berpengaruh ke: {e.crypto.assets.join(", ")}</div>
        </div>
      )}

      {e.stockAssets.length > 0 && (
        <p className="text-xs text-[var(--muted)]">Saham dan aset lain: {e.stockAssets.join(", ")}</p>
      )}

      {e.detailUrl && (
        <a href={e.detailUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] underline-offset-4 hover:underline">
          Lihat detail di Trading Economics
        </a>
      )}
    </li>
  );
}

export async function EconomicCalendarView({ filterParam }: { filterParam: unknown }) {
  const filter: Filter = isFilter(filterParam) ? filterParam : "berdampak";
  const todayKey = toWib(Date.now()).date;

  let bundle = null;
  let failed = false;
  try {
    bundle = await loadEconomicCalendar();
  } catch {
    failed = true;
  }

  const minKey = shiftKey(todayKey, -WINDOW_BACK_DAYS);
  const maxKey = shiftKey(todayKey, WINDOW_FORWARD_DAYS);
  const events = bundle
    ? bundle.events.filter((e) => e.wibDate !== null && e.wibDate >= minKey && e.wibDate <= maxKey && matches(e, filter))
    : [];
  const days = [...new Set(events.map((e) => e.wibDate as string))].sort();

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link key={f.id} href={`/calendar?view=ekonomi&dampak=${f.id}`} className="pill" data-active={filter === f.id}>
            {f.label}
          </Link>
        ))}
      </div>

      {failed || !bundle ? (
        <section className="card p-6 text-sm leading-relaxed text-[var(--muted)]">
          Kalender ekonomi belum bisa dimuat. Sumber datanya sedang tidak tersedia, atau belum dikonfigurasi. Coba lagi nanti.
        </section>
      ) : (
        <>
          <p className="text-sm text-[var(--muted)]">
            Sumber: halaman kalender Trading Economics · diperbarui{" "}
            {toWib(bundle.updatedAt).time} WIB
          </p>

          {days.length === 0 ? (
            <section className="card p-6 text-sm text-[var(--muted)]">Tidak ada rilis untuk filter ini dalam dua pekan ke depan.</section>
          ) : (
            days.map((day) => (
              <section key={day} className="flex flex-col gap-3" aria-labelledby={`day-${day}`}>
                <h2 id={`day-${day}`} className="text-lg">
                  {dayLabel(day, todayKey)}
                </h2>
                <ul className="card divide-y divide-[var(--line)]">
                  {events
                    .filter((e) => e.wibDate === day)
                    .sort((a, b) => (a.wibIso ?? "").localeCompare(b.wibIso ?? ""))
                    .map((e) => (
                      <EventCard key={e.id} e={e} />
                    ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}

      <p className="text-sm leading-relaxed text-[var(--muted)]">
        Dampak kripto dibaca dari selisih Actual dan Perkiraan. Ini heuristik, bukan prediksi, dan reaksi pasar bisa berbeda dari arah tersebut. Bukan saran investasi.
      </p>
    </>
  );
}
