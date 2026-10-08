/**
 * Tab khusus Premium. Guard tier dijalankan terpusat di app/[tab]/page.tsx
 * (berdasarkan ROUTE_RULES di lib/access.ts) sebelum fungsi di sini dipanggil.
 */
import { Heart, MessageCircle } from "lucide-react";
import { PageHeader, StatCard } from "@/components/ui";
import { getAnalytics, getPosts, getTrendingTopics } from "@/lib/data";
import { decimal, idr, pct, type ScreenProps } from "@/lib/shared";

export async function AnalysisScreen(_: ScreenProps) {
  const a = await getAnalytics();

  return (
    <>
      <PageHeader title="Analisis" subtitle="Risiko, kinerja, dan alokasi portofoliomu" />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Return 1 tahun" value={pct(a.annualReturn)} tone={a.annualReturn >= 0 ? "up" : "down"} />
        <StatCard label="Volatilitas tahunan" value={`${decimal(a.volatility)}%`} hint="Simpangan baku return mingguan" />
        <StatCard label="Rasio Sharpe" value={decimal(a.sharpe)} hint="Acuan bebas risiko 6%" />
        <StatCard label="Penurunan maksimum" value={`${decimal(a.maxDrawdown)}%`} tone="down" hint="Dari puncak ke lembah" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-lg">Alokasi per sektor</h2>
          <ul className="mt-5 flex flex-col gap-4">
            {a.sectors.map((s) => (
              <li key={s.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{s.label}</span>
                  <span className="text-[var(--muted)]">
                    {decimal(s.share, 1)}% · {idr(s.value)}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${s.share}%`, background: "linear-gradient(90deg,#14b8a6,#5eead4)" }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card overflow-x-auto">
          <h2 className="p-6 pb-2 text-lg">Kontributor untung/rugi</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Saham</th>
                <th className="num">Untung/rugi</th>
                <th className="num">%</th>
              </tr>
            </thead>
            <tbody>
              {a.contributors.map((c) => (
                <tr key={c.symbol}>
                  <td>
                    <div>{c.symbol}</div>
                    <div className="text-[11px] text-[var(--muted)]">{c.name}</div>
                  </td>
                  <td className={`num ${c.pnl >= 0 ? "up" : "down"}`}>{idr(c.pnl)}</td>
                  <td className={`num ${c.pnlPct >= 0 ? "up" : "down"}`}>{pct(c.pnlPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <p className="text-xs text-[var(--muted)]">Dihitung dari data tiruan untuk demo UI. Bukan saran investasi.</p>
    </>
  );
}

export async function CommunityScreen(_: ScreenProps) {
  const [posts, topics] = await Promise.all([getPosts(), getTrendingTopics()]);

  return (
    <>
      <PageHeader title="Komunitas" subtitle="Diskusi antar investor dan analis" />

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {posts.map((p) => (
            <article key={p.id} className="card p-6">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white"
                  style={{ background: "linear-gradient(135deg,#14b8a6,#115e59)" }}
                  aria-hidden
                >
                  {p.author[0]}
                </div>
                <div className="leading-tight">
                  <div className="text-sm">{p.author}</div>
                  <div className="text-[11px] text-[var(--muted)]">
                    {p.role} · {p.time}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[var(--text)]/90">{p.body}</p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span key={t} className="badge badge-free">
                      #{t}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                  <span className="inline-flex items-center gap-1">
                    <Heart size={14} /> {p.likes}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle size={14} /> {p.replies}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="card h-fit p-6">
          <h2 className="text-lg">Topik populer</h2>
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {topics.map((t) => (
              <li key={t.tag} className="flex items-center justify-between py-3 text-sm">
                <span>#{t.tag}</span>
                <span className="text-xs text-[var(--muted)]">{t.posts} posting</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <p className="text-xs text-[var(--muted)]">Konten tiruan untuk demo UI. Bukan saran investasi.</p>
    </>
  );
}
