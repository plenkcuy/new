import "server-only";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const NEXT_DATA = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

/** Mengambil JSON __NEXT_DATA__ dari halaman Next.js. null bila gagal atau strukturnya berubah. */
export async function fetchNextData(url: string): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(9000), cache: "no-store" });
    if (!res.ok) return null;
    const match = (await res.text()).match(NEXT_DATA);
    return match ? JSON.parse(match[1]) : null;
  } catch {
    return null;
  }
}

export type ScrapedQuote = { price: number; changePct: number | null; icon: string | null };

export const positive = (value: unknown): number | null => {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
};
