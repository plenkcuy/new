import Link from "next/link";
import { OctagonAlert, ShieldCheck, TriangleAlert, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui";
import type { Level } from "@/lib/behavior";
import { getBehaviorInsights, type BehaviorInsights } from "@/lib/journal";

type Tone = { chip: string; bar: string; icon: LucideIcon };
const OK: Tone = { chip: "bg-[color-mix(in_srgb,var(--up)_16%,transparent)] text-[var(--up)]", bar: "var(--up)", icon: ShieldCheck };
const WARN: Tone = { chip: "bg-[color-mix(in_srgb,#fbbf24_16%,transparent)] text-[#fbbf24]", bar: "#fbbf24", icon: TriangleAlert };
const BAD: Tone = { chip: "bg-[color-mix(in_srgb,var(--down)_16%,transparent)] text-[var(--down)]", bar: "var(--down)", icon: OctagonAlert };

const toneFor = (level: Level, high: Tone): Tone => (level === "rendah" ? OK : level === "sedang" ? WARN : high);

function Meter({ label, score, tone }: { label: string; score: number; tone: Tone }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm text-[var(--muted)]">
        <span>{label}</span>
        <span className="tabular-nums">{score} dari 100</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-valuetext={`${score} dari 100`}
        className="h-2 w-full rounded-full bg-white/10"
      >
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${score}%`, background: tone.bar }} />
      </div>
    </div>
  );
}

function Heading({ title, chip }: { title: string; chip?: { text: string; tone: Tone } }) {
  const Icon = chip?.tone.icon;
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-base font-medium">{title}</h3>
      {chip && Icon && (
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium leading-none ${chip.tone.chip}`}>
          <Icon size={15} aria-hidden /> {chip.text}
        </span>
      )}
    </div>
  );
}

function Facts({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-[var(--muted)]">
      {items.map((text) => (
        <li key={text}>{text}</li>
      ))}
    </ul>
  );
}

function Overtrading({ data }: { data: BehaviorInsights["overtrading"] }) {
  if (data.status === "insufficient") {
    return (
      <div>
        <Heading title="Risiko overtrading" />
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{data.message}</p>
      </div>
    );
  }
  const tone = toneFor(data.level, BAD);
  const label = { rendah: "Rendah", sedang: "Sedang", tinggi: "Tinggi" }[data.level];
  return (
    <div>
      <Heading title="Risiko overtrading" chip={{ text: label, tone }} />
      <div className="mt-3">
        <Meter label="Skor overtrading" score={data.score} tone={tone} />
      </div>
      <Facts items={data.signals} />
    </div>
  );
}

function Luck({ data }: { data: BehaviorInsights["luck"] }) {
  if (data.status === "insufficient") {
    const share = Math.round((data.closed / data.need) * 100);
    return (
      <div>
        <Heading title="Indikasi pola hoki" />
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          Butuh minimal {data.need} transaksi tertutup supaya ujinya bermakna. Sekarang ada {data.closed}.
        </p>
        <div
          role="meter"
          aria-label="Kelengkapan data"
          aria-valuemin={0}
          aria-valuemax={data.need}
          aria-valuenow={data.closed}
          aria-valuetext={`${data.closed} dari ${data.need} transaksi`}
          className="mt-3 h-2 w-full rounded-full bg-white/10"
        >
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${share}%` }} />
        </div>
      </div>
    );
  }
  if (data.status === "unprofitable") {
    return (
      <div>
        <Heading title="Indikasi pola hoki" />
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          Hasil bersihmu belum positif, jadi belum ada keuntungan yang perlu diuji hoki atau skill.
        </p>
      </div>
    );
  }
  const tone = toneFor(data.level, WARN);
  const label = { rendah: "Kecil", sedang: "Sedang", tinggi: "Besar" }[data.level];
  return (
    <div>
      <Heading title="Indikasi pola hoki" chip={{ text: `Hoki ${label}`, tone }} />
      <div className="mt-3">
        <Meter label="Skor pola hoki" score={data.score} tone={tone} />
      </div>
      <p className="mt-3 text-sm leading-relaxed">{data.summary}</p>
      <Facts items={data.facts} />
      {data.smallSample && <p className="mt-2 text-sm text-[var(--muted)]">Sampel masih kecil, kesimpulan bisa berubah.</p>}
    </div>
  );
}

export function BehaviorSkeleton() {
  return (
    <section className="card flex-1 p-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Memuat cek perilaku trading</span>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-6 h-5 w-40" />
      <Skeleton className="mt-3 h-2 w-full" />
      <Skeleton className="mt-4 h-4 w-full" />
      <Skeleton className="mt-8 h-5 w-40" />
      <Skeleton className="mt-3 h-2 w-full" />
      <Skeleton className="mt-4 h-4 w-3/4" />
    </section>
  );
}

export function BehaviorView({ data }: { data: BehaviorInsights }) {
  return (
    <section className="card flex flex-1 flex-col p-6" aria-labelledby="behavior-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="behavior-title" className="text-lg">
          Cek Perilaku Trading
        </h2>
        <Link href="/journal" className="pill whitespace-nowrap">
          Buka Jurnal
        </Link>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">Dihitung dari jurnalmu sendiri dan dibandingkan dengan kebiasaanmu.</p>

      <div className="mt-6 flex flex-col gap-7">
        <Overtrading data={data.overtrading} />
        <div className="h-px bg-[var(--line)]" aria-hidden />
        <Luck data={data.luck} />
      </div>

      <p className="mt-auto pt-6 text-sm leading-relaxed text-[var(--muted)]">Indikasi statistik, bukan kepastian dan bukan saran investasi.</p>
    </section>
  );
}

export async function BehaviorCard({ userId }: { userId: string }) {
  let data: BehaviorInsights;
  try {
    data = await getBehaviorInsights(userId);
  } catch {
    return (
      <section className="card flex-1 p-6">
        <h2 className="text-lg">Cek Perilaku Trading</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">Data jurnal belum bisa dibaca. Muat ulang halaman sebentar lagi.</p>
      </section>
    );
  }

  return <BehaviorView data={data} />;
}
