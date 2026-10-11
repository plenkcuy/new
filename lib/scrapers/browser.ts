import "server-only";

/**
 * Cadangan Puppeteer, dipakai bila axios dan cheerio tidak mendapat __NEXT_DATA__
 * (halaman diblokir atau butuh JavaScript). Satu browser pada satu waktu supaya memori aman.
 *
 *   Vercel atau AWS Lambda : @sparticuz/chromium + puppeteer-core (otomatis)
 *   Lokal                  : isi PUPPETEER_EXECUTABLE_PATH, atau pasang paket "puppeteer"
 *   Dimatikan              : SCRAPER_PUPPETEER=0
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type BrowserResult = { data: Record<string, any> | null; error: string | null };

let queue: Promise<unknown> = Promise.resolve();

export function fetchWithBrowser(url: string): Promise<BrowserResult> {
  if (process.env.SCRAPER_PUPPETEER === "0") return Promise.resolve({ data: null, error: "puppeteer dimatikan" });
  const job = queue.then(() => run(url));
  queue = job.catch(() => undefined);
  return job;
}

type Launched = { browser: { newPage(): Promise<any>; close(): Promise<void> } };

async function launch(): Promise<Launched> {
  const explicit = process.env.PUPPETEER_EXECUTABLE_PATH;
  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) || process.env.SCRAPER_BROWSER === "chromium";

  if (explicit) {
    const puppeteer = (await import("puppeteer-core")).default;
    return { browser: await puppeteer.launch({ executablePath: explicit, headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] }) };
  }

  if (serverless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = (await import("puppeteer-core")).default;
    return {
      browser: await puppeteer.launch({
        args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
        executablePath: await chromium.executablePath(),
        headless: "shell",
      }),
    };
  }

  // Pengembangan lokal: paket puppeteer lengkap (opsional, tidak ikut dependensi).
  const name = "puppeteer";
  const full = (await import(/* webpackIgnore: true */ name)).default;
  return { browser: await full.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] }) };
}

async function run(url: string): Promise<BrowserResult> {
  let launched: Launched | null = null;
  try {
    launched = await launch();
    const page = await launched.browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setExtraHTTPHeaders({ "Accept-Language": "id-ID,id;q=0.9,en;q=0.8" });

    // Gambar, font, dan CSS tidak dibutuhkan untuk membaca data.
    await page.setRequestInterception(true);
    page.on("request", (req: { resourceType(): string; abort(): void; continue(): void }) => {
      ["image", "media", "font", "stylesheet"].includes(req.resourceType()) ? req.abort() : req.continue();
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForSelector("script#__NEXT_DATA__", { timeout: 15_000 });
    const raw: string | null = await page.$eval("script#__NEXT_DATA__", (el: { textContent: string | null }) => el.textContent);
    if (!raw) return { data: null, error: "__NEXT_DATA__ kosong" };
    return { data: JSON.parse(raw), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message.slice(0, 160) : "gagal" };
  } finally {
    await launched?.browser.close().catch(() => undefined);
  }
}
