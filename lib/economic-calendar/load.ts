import "server-only";
import { unstable_cache } from "next/cache";
import type { EconEvent } from "./model";
import { scrapeTradingEconomics } from "./scrape";

export type EconBundle = { updatedAt: number; events: EconEvent[] };

/**
 * Mengambil kalender ekonomi AS dari halaman Trading Economics.
 * Di-cache 15 menit. Kalau pengambilan gagal atau hasilnya kosong, error dilempar
 * supaya hasil kosong tidak ikut tersimpan.
 */
async function build(): Promise<EconBundle> {
  const events = await scrapeTradingEconomics();
  if (events.length === 0) throw new Error("scraper tidak menemukan event");
  return { updatedAt: Date.now(), events };
}

export const loadEconomicCalendar = unstable_cache(build, ["econ-calendar-v2"], {
  revalidate: 15 * 60,
  tags: ["econ-calendar"],
});
