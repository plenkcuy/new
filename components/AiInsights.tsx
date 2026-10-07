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
        style={{
          background: "radial-gradient(60% 100% at 50% 100%, rgba(94,234,212,0.4), transparent 70%)",
        }}
      />

      <button
        className="relative z-10 mt-8 rounded-full px-7 py-3 text-sm font-medium text-[#031a18] shadow-[0_0_40px_rgba(45,212,191,0.45)] transition hover:brightness-110"
        style={{ background: "linear-gradient(120deg,#5eead4,#2dd4bf)" }}
      >
        Jelajahi Insight AI
      </button>
    </section>
  );
}
