import Link from "next/link";

/** Kartu insight AI. Hanya dirender untuk tier yang memiliki fitur "ai-insights". */
export function AiInsights() {
  return (
    <section
      className="card-glow relative flex flex-col items-center justify-between px-6 pb-6 pt-7 text-center"
      style={{ minHeight: 230 }}
    >
      <div>
        <h2 className="text-xl">Keputusan Berbasis Data</h2>
        <p className="mx-auto mt-3 max-w-[300px] text-xs leading-relaxed text-[var(--muted)]">
          Tinggalkan tebak-tebakan. Dapatkan insight berbasis AI yang disesuaikan dengan strategi investasimu.
        </p>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
        style={{ background: "radial-gradient(60% 100% at 50% 100%, rgba(94,234,212,0.4), transparent 70%)" }}
      />

      <Link
        href="/analysis"
        className="btn btn-primary relative z-10 mt-8 shadow-[0_0_40px_rgba(45,212,191,0.45)]"
      >
        Jelajahi Insight AI
      </Link>
    </section>
  );
}
