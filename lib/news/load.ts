import "server-only";
import { unstable_cache } from "next/cache";
import { DIRECT_FEEDS, SEARCH_SOURCES, type NewsMarket } from "./sources";
import { fetchFeed, googleSearchUrl, type RawItem } from "./feed";
import { NARRATIVES, narrativeWeight, tagsFor, type NarrativeId } from "./narrative";

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: number | null;
  tags: NarrativeId[];
  score: number;
};

export type NarrativeGroup = { id: NarrativeId; label: string; count: number; items: NewsItem[] };

export type NewsBundle = {
  market: NewsMarket;
  updatedAt: number;
  items: NewsItem[];
  narratives: NarrativeGroup[];
  sourcesOk: number;
  sourcesTotal: number;
};

const MAX_ITEMS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Judul dinormalisasi untuk menghapus duplikat dari sumber yang berbeda. */
const keyOf = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 70);

/** Google News menulis judul sebagai "Judul - Nama media". Akhiran itu dibuang, nama media diambil dari <source>. */
function cleanTitle(title: string, source: string | null): string {
  let t = title;
  if (source && t.endsWith(` - ${source}`)) t = t.slice(0, -(source.length + 3));
  return t.replace(/\s+/g, " ").trim().slice(0, 220);
}

function scoreOf(tags: NarrativeId[], publishedAt: number | null, now: number): number {
  const weight = tags.reduce((sum, id) => sum + narrativeWeight(id), 0);
  const ageHours = publishedAt ? Math.max(0, (now - publishedAt) / 3_600_000) : 48;
  return weight - ageHours * 0.15;
}

async function build(market: NewsMarket): Promise<NewsBundle> {
  const searches = SEARCH_SOURCES.filter((s) => s.market === market).map((s) => ({
    label: s.id,
    url: googleSearchUrl(s.query, s.edition),
  }));
  const directs = DIRECT_FEEDS.filter((f) => f.market === market).map((f) => ({ label: f.id, url: f.url }));
  const sources = [...searches, ...directs];

  const settled = await Promise.allSettled(sources.map((s) => fetchFeed(s.url)));
  const now = Date.now();
  const seen = new Set<string>();
  const items: NewsItem[] = [];
  let sourcesOk = 0;

  settled.forEach((result, index) => {
    const raw: RawItem[] | null = result.status === "fulfilled" ? result.value : null;
    if (!raw) return;
    sourcesOk += 1;
    for (const r of raw) {
      const source = r.source ?? sources[index].label;
      const title = cleanTitle(r.title, r.source);
      if (!title) continue;
      const key = keyOf(title);
      if (!key || seen.has(key)) continue;
      seen.add(key);

      // Ringkasan ikut dihitung supaya artikel yang tidak menyebut kata kunci di judul tetap terklasifikasi.
      const tags = tagsFor(`${title} ${r.summary}`);
      if (r.publishedAt && now - r.publishedAt > 3 * DAY_MS) continue;
      items.push({
        id: Buffer.from(r.url).toString("base64url").slice(0, 32),
        title,
        url: r.url,
        source,
        publishedAt: r.publishedAt,
        tags,
        score: scoreOf(tags, r.publishedAt, now),
      });
    }
  });

  if (items.length === 0) throw new Error(`berita ${market} kosong, semua sumber gagal`);

  items.sort((a, b) => b.score - a.score || (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
  const list = items.slice(0, MAX_ITEMS);

  const narratives: NarrativeGroup[] = [];
  for (const n of NARRATIVES) {
    const matched = list.filter((i) => i.tags.includes(n.id));
    if (matched.length === 0) continue;
    narratives.push({ id: n.id, label: n.label, count: matched.length, items: matched.slice(0, 3) });
  }
  narratives.sort((a, b) => b.count - a.count || narrativeWeight(b.id) - narrativeWeight(a.id));

  return { market, updatedAt: now, items: list, narratives: narratives.slice(0, 6), sourcesOk, sourcesTotal: sources.length };
}

/** Di-cache 15 menit per pasar. Kalau semua sumber gagal, error dilempar supaya hasil kosong tidak ikut tersimpan. */
export const loadNews = unstable_cache(build, ["news-v1"], { revalidate: 15 * 60, tags: ["news"] });

