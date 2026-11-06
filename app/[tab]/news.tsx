import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { PageHeader } from "@/components/ui";
import { loadNews, type NewsBundle, type NewsItem } from "@/lib/news/load";
import { NARRATIVES, narrativeLabel, type NarrativeId } from "@/lib/news/narrative";
import { NEWS_MARKETS, NEWS_MARKET_LABEL, isNewsMarket, type NewsMarket } from "@/lib/news/sources";
import type { ScreenProps } from "@/lib/shared";

const clock = (ms: number | null) =>
  ms === null
    ? "Waktu tidak diketahui"
    : new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      }).format(ms);

const NARRATIVE_IDS = NARRATIVES.map((n) => n.id) as readonly NarrativeId[];
const isNarrative = (v: unknown): v is NarrativeId => typeof v === "string" && (NARRATIVE_IDS as readonly string[]).includes(v);

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function ArticleLink({ item }: { item: NewsItem }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer nofollow" className="text-base leading-snug hover:text-[var(--accent)]">
      {item.title}
    </a>
  );
}

function Meta({ item }: { item: NewsItem }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
      <span>{item.source}</span>
      <span aria-hidden>·</span>
      <span>{clock(item.publishedAt)}</span>
    </div>
  );
}

function NarrativeSection({ bundle, market }: { bundle: NewsBundle; market: NewsMarket }) {
  if (bundle.narratives.length === 0) return null;
  return (
    <section aria-labelledby="narasi-utama" className="flex flex-col gap-3">
      <h2 id="narasi-utama" className="text-lg">
        Narasi utama
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {bundle.narratives.map((group) => (
          <article key={group.id} className="card flex flex-col gap-3 p-5">
            <header className="flex items-center justify-between gap-3">
              <h3 className="text-base font-medium">{group.label}</h3>
              <Link href={`/news?market=${market}&narasi=${group.id}`} className="text-xs text-[var(--muted)] hover:text-[var(--accent)]">
                {group.count} berita
              </Link>
            </header>
            <ul className="flex flex-col gap-3">
              {group.items.map((item) => (
                <li key={item.id} className="min-w-0">
                  <ArticleLink item={item} />
                  <Meta item={item} />
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export async function NewsScreen({ query }: ScreenProps) {
  const market: NewsMarket = isNewsMarket(first(query.market)) ? (first(query.market) as NewsMarket) : "idx";
  const narrative = isNarrative(first(query.narasi)) ? (first(query.narasi) as NarrativeId) : null;
  const href = (m: NewsMarket, n?: NarrativeId | null) => `/news?market=${m}${n ? `&narasi=${n}` : ""}`;

  const header = (
    <PageHeader title="Berita" subtitle="Berita pasar dari media Indonesia dan global, dikelompokkan menurut narasi" />
  );

  let bundle: NewsBundle | null = null;
  let failed = false;
  try {
    bundle = await loadNews(market);
  } catch {
    failed = true;
  }

  const items = bundle ? (narrative ? bundle.items.filter((i) => i.tags.includes(narrative)) : bundle.items) : [];

  return (
    <>
      {header}
      <AutoRefresh intervalMs={10 * 60 * 1000} />

      <div className="flex flex-wrap items-center gap-2">
        {NEWS_MARKETS.map((m) => (
          <Link key={m} href={href(m)} className="pill" data-active={m === market} aria-current={m === market ? "page" : undefined}>
            {NEWS_MARKET_LABEL[m]}
          </Link>
        ))}
      </div>

      {failed || !bundle ? (
        <section className="card p-6 text-sm leading-relaxed text-[var(--muted)]">
          Berita belum bisa dimuat sekarang. Sumber berita sedang tidak bisa dijangkau, coba lagi beberapa menit lagi.
        </section>
      ) : (
        <>
          <p className="text-sm text-[var(--muted)]">
            Diperbarui {clock(bundle.updatedAt)} WIB · {bundle.sourcesOk} dari {bundle.sourcesTotal} sumber terbaca
          </p>

          <NarrativeSection bundle={bundle} market={market} />

          <section aria-labelledby="semua-berita" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="semua-berita" className="text-lg">
                {narrative ? `Berita ${narrativeLabel(narrative)}` : "Semua berita"}
              </h2>
              {narrative && (
                <Link href={href(market)} className="text-sm text-[var(--accent)]">
                  Tampilkan semua
                </Link>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {NARRATIVES.map((n) => (
                <Link key={n.id} href={href(market, n.id)} className="pill !min-h-[32px] !px-3 !py-1.5 !text-xs" data-active={narrative === n.id}>
                  {n.label}
                </Link>
              ))}
            </div>

            {items.length === 0 ? (
              <div className="card p-6 text-sm text-[var(--muted)]">Belum ada berita untuk narasi ini.</div>
            ) : (
              <ul className="card divide-y divide-[var(--line)]">
                {items.map((item) => (
                  <li key={item.id} className="min-w-0 p-4 sm:p-5">
                    <ArticleLink item={item} />
                    <Meta item={item} />
                    {item.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.tags.map((t) => (
                          <span key={t} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-[var(--muted)]">
                            {narrativeLabel(t)}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <p className="text-sm leading-relaxed text-[var(--muted)]">
        Judul dan ringkasan berasal dari media yang bersangkutan. Lumen hanya mengelompokkannya, bukan saran membeli atau menjual.
      </p>
    </>
  );
}
