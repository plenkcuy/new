import "server-only";

/**
 * Pengambilan dan parsing RSS/Atom. Tanpa dependensi tambahan.
 * Keamanan: URL hanya dari sources.ts (bukan input pengguna), batas waktu dan ukuran dipasang,
 * tautan artikel hanya diterima kalau protokolnya http atau https, dan isi deskripsi dibersihkan dari tag HTML.
 */

const TIMEOUT_MS = 8000;
const MAX_BYTES = 1_500_000;
const USER_AGENT = "LumenNewsReader/1.0 (+RSS)";

export type RawItem = {
  title: string;
  url: string;
  source: string | null;
  publishedAt: number | null;
  summary: string;
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };

export function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeChar(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeChar(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m);
}

const safeChar = (code: number): string => (Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "");

/** Ambil isi satu tag, membuka CDATA dan entitas HTML. */
function textOf(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return null;
  const raw = m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1");
  return decodeEntities(raw).trim() || null;
}

function hrefOf(block: string): string | null {
  const m = block.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/i);
  return m ? decodeEntities(m[1]) : null;
}

const stripTags = (value: string) => value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function safeUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function dateOf(value: string | null): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

export function parseFeed(xml: string): RawItem[] {
  const out: RawItem[] = [];
  const blocks = xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi);
  for (const match of blocks) {
    const block = match[2];
    const title = textOf(block, "title");
    const url = safeUrl(textOf(block, "link") ?? hrefOf(block));
    if (!title || !url) continue;

    const sourceMatch = block.match(/<source\b[^>]*>([\s\S]*?)<\/source>/i);
    const source = sourceMatch ? decodeEntities(sourceMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "")).trim() || null : null;
    // Deskripsi RSS berisi HTML yang di-escape. Tag dibuang dulu, lalu entitas sisanya didekode.
    const summary = decodeEntities(stripTags(textOf(block, "description") ?? textOf(block, "summary") ?? textOf(block, "content") ?? "")).slice(0, 400);
    const publishedAt = dateOf(textOf(block, "pubDate") ?? textOf(block, "published") ?? textOf(block, "updated"));

    out.push({ title, url, source, publishedAt, summary });
  }
  return out;
}

/** Ambil dan parse satu feed. Mengembalikan null kalau gagal, dan pemanggil tetap jalan dengan sumber lain. */
export async function fetchFeed(url: string): Promise<RawItem[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) return null;
    const body = await res.text();
    if (body.length > MAX_BYTES) return null;
    return parseFeed(body);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** URL pencarian Google News RSS. Parameter disusun lewat URLSearchParams supaya tidak ada injeksi. */
export function googleSearchUrl(query: string, edition: { hl: string; gl: string; ceid: string }): string {
  const params = new URLSearchParams({ q: `${query} when:3d`, hl: edition.hl, gl: edition.gl, ceid: edition.ceid });
  return `https://news.google.com/rss/search?${params.toString()}`;
}
