import "server-only";
import axios from "axios";
import * as cheerio from "cheerio";
import { fetchWithBrowser } from "./browser";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

export type NextDataResult = {
  data: Record<string, any> | null;
  via: "axios" | "puppeteer" | null;
  error: string | null;
};

function readNextData(html: string): Record<string, any> | null {
  const raw = cheerio.load(html)("script#__NEXT_DATA__").html();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function describe(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response) return `HTTP ${err.response.status}`;
    return err.code === "ECONNABORTED" ? "timeout" : (err.code ?? err.message);
  }
  return err instanceof Error ? err.message.slice(0, 160) : "gagal";
}

/**
 * Mengambil __NEXT_DATA__ seperti scraper aslinya: axios + cheerio (timeout 20 detik).
 * Bila gagal dan `browser` true, dicoba ulang lewat Puppeteer.
 */
export async function fetchNextDataDetailed(
  url: string,
  opts: { timeoutMs?: number; browser?: boolean } = {},
): Promise<NextDataResult> {
  let error: string;
  try {
    const res = await axios.get<string>(url, {
      headers: HEADERS,
      timeout: opts.timeoutMs ?? 20_000,
      responseType: "text",
      transformResponse: [(body) => body],
    });
    const data = readNextData(String(res.data));
    if (data) return { data, via: "axios", error: null };
    error = "tag __NEXT_DATA__ tidak ditemukan";
  } catch (err) {
    error = describe(err);
  }

  if (opts.browser === false) return { data: null, via: null, error };

  const browser = await fetchWithBrowser(url);
  if (browser.data) return { data: browser.data, via: "puppeteer", error: null };
  return { data: null, via: null, error: `axios: ${error}; puppeteer: ${browser.error}` };
}

/** Versi ringkas untuk harga satuan: tanpa Puppeteer agar kutipan tetap cepat. */
export async function fetchNextData(url: string): Promise<Record<string, any> | null> {
  return (await fetchNextDataDetailed(url, { timeoutMs: 15_000, browser: false })).data;
}

export type ScrapedQuote = { price: number; changePct: number | null; icon: string | null };

export const positive = (value: unknown): number | null => {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Angka dari number atau teks seperti "2,31%", "+1.5", "3.420", "1.234,5".
 * Bila ada titik dan koma, yang muncul terakhir adalah pemisah desimal. Titik tunggal yang
 * membagi angka per tiga digit ("3.420") dibaca sebagai pemisah ribuan. null bila bukan angka.
 */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  let text = value.replace(/[%+\s]/g, "");
  const dot = text.lastIndexOf(".");
  const comma = text.lastIndexOf(",");

  if (dot !== -1 && comma !== -1) {
    text = dot > comma ? text.replace(/,/g, "") : text.replace(/\./g, "").replace(",", ".");
  } else if (comma !== -1) {
    text = /^-?\d{1,3}(,\d{3})+$/.test(text) ? text.replace(/,/g, "") : text.replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, "");
  }

  if (text === "" || text === "-") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}
