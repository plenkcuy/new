const buckets = new Map<string, number[]>();
const MAX_KEYS = 5000;

export type Limit = { ok: true } | { ok: false; retryAfter: number };

/**
 * Pembatas permintaan jendela geser per kunci (misalnya per pengguna). Disimpan di memori instance,
 * jadi di serverless ini perlindungan sebisanya: cukup untuk menahan pencarian yang menembak scraper
 * berulang kali dari satu akun, bukan pengganti pembatas di tepi jaringan.
 */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): Limit {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)) };
  }
  hits.push(now);
  buckets.set(key, hits);

  if (buckets.size > MAX_KEYS) {
    for (const [k, list] of buckets) {
      if (!list.some((t) => now - t < windowMs)) buckets.delete(k);
    }
  }
  return { ok: true };
}
