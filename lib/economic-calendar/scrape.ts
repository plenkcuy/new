import "server-only";
import axios from "axios";
import * as cheerio from "cheerio";
import { toEvent, toWib, type EconEvent, type RawEvent } from "./model";

/**
 * Scraper halaman kalender Trading Economics (port dari te-calendar.js).
 * Selectornya mengikuti struktur halaman saat skrip dibuat, dan bisa berubah sewaktu-waktu.
 *
 * Keamanan: URL tetap di kode, batas waktu dan ukuran dipasang, dan HTML hanya di-parse, tidak dijalankan.
 */

const URL = "https://tradingeconomics.com/united-states/calendar";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};
const MONTHS: Record<string, number> = {
  January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
  July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
};

function parseDateHeader(text: string): { month: number; day: number; year: number } | null {
  // "Thursday November 05 2026"
  const m = text.match(/(\w+)\s+(\w+)\s+(\d{1,2})\s+(\d{4})/);
  if (!m || !(m[2] in MONTHS)) return null;
  return { month: MONTHS[m[2]], day: parseInt(m[3], 10), year: parseInt(m[4], 10) };
}

function parseTimeUTC(text: string): { hours: number; minutes: number } | null {
  // "10:30 AM", "01:30 PM", "12:00 AM" (tengah malam)
  const m = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return { hours: h, minutes: parseInt(m[2], 10) };
}

function importanceStars($row: cheerio.Cheerio<import("domhandler").Element>): number {
  const $span = $row.find("td").first().find('span[class*="calendar-date-"]').first();
  if (!$span.length) return 0;
  const m = ($span.attr("class") || "").match(/calendar-date-(\d)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Parse HTML kalender. Dipisah dari pengambilan halaman supaya bisa diuji dengan fixture. */
export function parseCalendarHtml(html: string): EconEvent[] {
  const $ = cheerio.load(html);
  const raws: RawEvent[] = [];

  let dateInfo: { month: number; day: number; year: number } | null = null;
  let dateText = "";

  // Anak langsung dari <table id="calendar">: thead berisi tanggal, tbody berisi event pada tanggal itu.
  $("#calendar").children().each((_, el) => {
    const $el = $(el);
    if ($el.is("thead.table-header")) {
      dateText = $el.find("th").first().text().trim();
      dateInfo = parseDateHeader(dateText);
      return;
    }
    const current = dateInfo;
    if (!$el.is("tbody") || !current) return;

    $el.find("tr").each((_, row) => {
      const $row = $(row);
      const timeText = $row.find("td").first().find("span").first().text().trim();
      let name = $row.find("a.calendar-event").first().text().trim();
      if (!name) name = $row.find("td").eq(2).find("span").first().text().trim();
      if (!name) return;

      const category = $row.attr("data-category") || "";
      const href = $row.attr("data-url") || "";
      const base = {
        name,
        category,
        stars: importanceStars($row),
        actual: $row.find("span#actual").text().trim(),
        previous: $row.find("span#previous").text().trim(),
        consensus: $row.find("a#consensus, span#consensus").first().text().trim(),
        detailUrl: href.startsWith("/") ? `https://tradingeconomics.com${href}` : null,
        source: "scrape" as const,
      };

      // Event tanpa jam tetap (misalnya tracker) tetap ditampilkan, tapi tanpa waktu.
      const time = parseTimeUTC(timeText);
      if (!timeText || !time) {
        raws.push({ ...base, wibIso: null, wibDate: null, wibTime: null });
        return;
      }
      const utcMs = Date.UTC(current.year, current.month, current.day, time.hours, time.minutes);
      const wib = toWib(utcMs);
      raws.push({ ...base, wibIso: wib.iso, wibDate: wib.date, wibTime: wib.time });
    });
  });

  return raws.map(toEvent);
}

export async function scrapeTradingEconomics(): Promise<EconEvent[]> {
  const { data: html } = await axios.get<string>(URL, {
    headers: HEADERS,
    timeout: 20_000,
    maxContentLength: 3_000_000,
    maxRedirects: 3,
    responseType: "text",
  });
  return parseCalendarHtml(html);
}
