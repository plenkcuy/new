import "server-only";
import { db } from "@/lib/db";
import type { Bias } from "./engine";
import type { FuturesSnapshot } from "./analyze";

export type LatestBias = { symbol: string; label: string; bias: Bias; createdAt: string };

export async function saveSnapshot(snapshot: FuturesSnapshot): Promise<number> {
  const sql = db();
  const rows = snapshot.cards.filter((c) => c.ok);
  for (const card of rows) {
    await sql`
      insert into futures_snapshot (symbol, label, bias, derivative_score, payload)
      values (${card.symbol}, ${card.label}, ${card.bias}, ${card.derivatives?.total ?? null}, ${JSON.stringify(card)}::jsonb)
    `;
  }
  return rows.length;
}

export async function latestBiases(): Promise<LatestBias[]> {
  try {
    const rows = await db()`
      select distinct on (symbol) symbol, label, bias, created_at
      from futures_snapshot
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
