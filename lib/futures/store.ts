import "server-only";
import { db } from "@/lib/db";
import type { Bias } from "./engine";

const PAIR_RE = /^[A-Z0-9]{1,15}USDT$/;
const BIASES: readonly string[] = ["LONG", "SHORT", "NETRAL"];
const MIN_GAP_MINUTES = 30;

export type SnapshotInput = { symbol: string; bias: Bias; derivativeScore: number | null };
export type LatestBias = { symbol: string; label: string; bias: Bias; createdAt: string };

export function sanitizeSnapshot(body: unknown): SnapshotInput[] {
  const cards = (body as { cards?: unknown } | null)?.cards;
  if (!Array.isArray(cards)) return [];
  const seen = new Set<string>();
  const out: SnapshotInput[] = [];
  for (const raw of cards.slice(0, 6)) {
    const card = raw as { symbol?: unknown; bias?: unknown; derivativeScore?: unknown };
    if (typeof card.symbol !== "string" || !PAIR_RE.test(card.symbol) || seen.has(card.symbol)) continue;
    if (typeof card.bias !== "string" || !BIASES.includes(card.bias)) continue;
    const score = typeof card.derivativeScore === "number" && Number.isFinite(card.derivativeScore) ? Math.round(card.derivativeScore) : null;
    seen.add(card.symbol);
    out.push({ symbol: card.symbol, bias: card.bias as Bias, derivativeScore: score });
  }
  return out;
}

export async function saveSnapshot(userId: string, rows: SnapshotInput[]): Promise<number> {
  if (!rows.length) return 0;
  const sql = db();
  const recent = await sql`
    select 1 from futures_snapshot
    where user_id = ${userId} and created_at > now() - make_interval(mins => ${MIN_GAP_MINUTES})
    limit 1
  `;
  if (recent.length) return 0;
  for (const row of rows) {
    await sql`
      insert into futures_snapshot (user_id, symbol, label, bias, derivative_score, payload)
      values (${userId}, ${row.symbol}, ${row.symbol.slice(0, -4)}, ${row.bias}, ${row.derivativeScore}, '{}'::jsonb)
    `;
  }
  return rows.length;
}

export async function latestBiases(userId: string): Promise<LatestBias[]> {
  try {
    const rows = await db()`
      select distinct on (symbol) symbol, label, bias, created_at
      from futures_snapshot
      where user_id = ${userId} and created_at > now() - interval '7 days'
      order by symbol, created_at desc
    `;
    return rows.map((r) => ({
      symbol: String(r.symbol),
      label: String(r.label),
      bias: r.bias as Bias,
      createdAt: new Date(r.created_at as string).toISOString(),
    }));
  } catch {
    return [];
  }
}
