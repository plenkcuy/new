"use client";

import { ChevronDown, Minus, RefreshCw, Search, TrendingDown, TrendingUp, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getFuturesSentiment, type FuturesCard, type FuturesSnapshot } from "@/lib/futures/analyze";
import type { Bias, Vote } from "@/lib/futures/engine";
import { fetchCatalog } from "@/lib/futures/feed";
import {
  DEFAULT_WATCH,
  MAX_WATCH,
  normalizeQuery,
  sanitizeWatch,
  searchCatalog,
  stripMultiplier,
  type Catalog,
  type Venue,
} from "@/lib/futures/symbols";
import { chartUrl, tvLink } from "@/lib/futures/tradingview";
import { Skeleton } from "@/components/ui";
import { pct, unitPrice } from "@/lib/shared";

type Tone = "up" | "down" | "flat" | "info";
type Density = "besar" | "sedang" | "kecil";

const TONE_CLASS: Record<Tone, string> = {
  up: "bg-[color-mix(in_srgb,var(--up)_16%,transparent)] text-[var(--up)]",
  down: "bg-[color-mix(in_srgb,var(--down)_16%,transparent)] text-[var(--down)]",
  flat: "bg-white/10 text-[var(--muted)]",
  info: "bg-white/10 text-[var(--text)]",
};

const WATCH_KEY = "lumen:futures:watch:v1";
const SEARCH_KEY = "lumen:futures:search:v1";
const CHART_KEY = "lumen:futures:chart:v1";
const DENSITY_KEY = "lumen:futures:density:v1";
const REFRESH_COOLDOWN_S = 10;
const VENUE_LABEL: Record<Venue, string> = { spot: "Spot", futures: "Futures" };

const DENSITIES: Density[] = ["besar", "sedang", "kecil"];
const DENSITY_LABEL: Record<Density, string> = { besar: "Besar", sedang: "Sedang", kecil: "Kecil" };
/** Lebar minimum kartu per ukuran. Makin banyak koin, kartu makin kecil (lihat tileMin). */
const TILE_MIN: Record<Density, number> = { besar: 460, sedang: 360, kecil: 280 };
const CHART_HEIGHT: Record<Density, number> = { besar: 320, sedang: 240, kecil: 180 };

const BIAS_META: Record<Bias, { icon: typeof TrendingUp; tone: Tone; tip: string }> = {
  LONG: {
    icon: TrendingUp,
    tone: "up",
    tip: "Tekanan beli dominan. Tentukan stop loss sebelum masuk dan jangan mengejar harga yang sudah terlanjur lari.",
  },
  SHORT: {
    icon: TrendingDown,
    tone: "down",
    tip: "Tekanan jual dominan. Hindari melawan arah, dan tunggu konfirmasi sebelum mengambil keputusan.",
  },
  NETRAL: {
    icon: Minus,
    tone: "flat",
    tip: "Sinyal belum searah. Tidak masuk posisi juga keputusan yang sah.",
  },
};

const voteTone = (vote: Vote): Tone => (vote === 1 ? "up" : vote === -1 ? "down" : "flat");
const voteLabel = (vote: Vote) => (vote === 1 ? "Naik" : vote === -1 ? "Turun" : "Netral");
const pointTone = (point: number): Tone => (point > 0 ? "up" : point < 0 ? "down" : "flat");
const pointLabel = (point: number) => (point > 0 ? `+${point}` : String(point));
const convictionLabel = (c: number) => (c >= 0.67 ? "Tinggi" : c >= 0.34 ? "Sedang" : "Rendah");

const isDensity = (v: unknown): v is Density => typeof v === "string" && (DENSITIES as string[]).includes(v);

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === "1" ? true : raw === "0" ? false : fallback;
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    return;
  }
}

function readDensity(): Density {
  try {
    const raw = window.localStorage.getItem(DENSITY_KEY);
    return isDensity(raw) ? raw : "sedang";
  } catch {
    return "sedang";
  }
}

function loadWatch(): string[] {
  try {
    const raw = window.localStorage.getItem(WATCH_KEY);
    return raw === null ? DEFAULT_WATCH : sanitizeWatch(JSON.parse(raw));
  } catch {
    return DEFAULT_WATCH;
  }
}

function saveWatch(list: string[]) {
  try {
    window.localStorage.setItem(WATCH_KEY, JSON.stringify(list));
  } catch {
    return;
  }
}

function heroStyle(bias: Bias, conviction: number): React.CSSProperties {
  if (bias === "NETRAL") return { background: "linear-gradient(165deg, #070e0e 0%, #0a1414 100%)" };
  const rgb = bias === "LONG" ? "46, 232, 111" : "255, 90, 95";
  return {
    background: `linear-gradient(170deg, #050a0a 38%, rgba(${rgb}, ${(0.16 + 0.34 * conviction).toFixed(2)}) 135%)`,
    borderColor: `rgba(${rgb}, ${(0.25 + 0.3 * conviction).toFixed(2)})`,
  };
}

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium leading-none ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
}

function fundingText(value: number | null) {
  if (value === null) return "Belum ada data";
  const percent = value * 100;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(4).replace(".", ",")}%`;
}

function Row({ label, value, point, note }: { label: string; value: string; point: number; note: string }) {
  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-sm text-[var(--muted)]">{label}</span>
          <span className="text-sm font-medium">{value}</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{note}</p>
      </div>
      <Chip tone={pointTone(point)}>{pointLabel(point)}</Chip>
    </li>
  );
}

function GroupRow({ label, vote, detail }: { label: string; vote: Vote; detail: string }) {
  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{detail}</p>
      </div>
      <Chip tone={voteTone(vote)}>{voteLabel(vote)}</Chip>
    </li>
  );
}

function TradingViewChart({ symbol, venue, height }: { symbol: string; venue: Venue; height: number }) {
  const url = useMemo(() => chartUrl(symbol, venue), [symbol, venue]);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setSlow(false);
    const timer = setTimeout(() => setSlow(true), 12_000);
    return () => clearTimeout(timer);
  }, [url]);

  return (
    <div className="relative w-full" style={{ height }}>
      <iframe
        key={url}
        title={`Chart TradingView ${symbol} ${VENUE_LABEL[venue]}`}
        src={url}
        // Lintas origin, jadi allow-same-origin hanya memberi widget origin miliknya sendiri (bukan origin Lumen).
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoaded(true)}
        className="h-full w-full rounded-2xl border border-[var(--line)]"
      />
      {!loaded && (
        <div role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-[var(--muted)]">
          {slow ? "Chart belum tampil? Cek koneksi atau pemblokir iklan, atau buka lewat tautan TradingView di atas." : "Memuat chart TradingView..."}
        </div>
      )}
    </div>
  );
}

/**
 * Detail analisis. Susunan satu kolom, dan baru dua kolom bila kartunya cukup lebar (container query).
 * Dengan begitu isinya tidak pernah melebar atau gepeng horizontal, apa pun ukuran kartunya.
 */
function Details({ card }: { card: FuturesCard }) {
  const { metrics, derivatives, technical } = card;
  const t = technical?.input;
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-6 @min-[42rem]:grid-cols-2">
      {derivatives ? (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-medium">Screening derivatif</h3>
            <span className={`text-sm font-medium ${derivatives.total > 0 ? "up" : derivatives.total < 0 ? "down" : "text-[var(--muted)]"}`}>
              Skor {pointLabel(derivatives.total)}
            </span>
          </div>
          <ul className="mt-1 divide-y divide-[var(--line)]">
            <Row
              label="Open Interest 24 jam"
              value={metrics.oiChange24h === null ? "Belum ada data" : pct(metrics.oiChange24h)}
              point={derivatives.oi.point}
              note={derivatives.oi.text}
            />
            <Row label="Funding Rate" value={fundingText(metrics.funding)} point={derivatives.funding.point} note={derivatives.funding.text} />
            <Row
              label="Long Short Ratio"
              value={
                metrics.ratio === null
                  ? "Belum ada data"
                  : `${metrics.ratio.toFixed(2).replace(".", ",")} (${Math.round(metrics.longPct ?? 0)}% long)`
              }
              point={derivatives.ls.point}
              note={derivatives.ls.text}
            />
          </ul>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-[var(--muted)]">Koin ini tidak punya kontrak futures, jadi screening derivatif tidak tersedia.</p>
      )}

      {technical && t && (
        <div className="min-w-0">
          <h3 className="text-base font-medium">Konfluensi teknikal harian</h3>
          <ul className="mt-1 divide-y divide-[var(--line)]">
            <GroupRow
              label="Tren"
              vote={technical.groups.tren}
              detail={`Harga ${t.close > t.ema21 ? "di atas" : "di bawah"} EMA 21, MACD ${t.macdHist > 0 ? "positif" : "negatif"}, ADX ${Math.round(t.adx)}`}
            />
            <GroupRow
              label="Momentum"
              vote={technical.groups.momentum}
              detail={`Stoch ${Math.round(t.stochK)} dan ${Math.round(t.stochD)}, RSI ${Math.round(t.rsi)}, Williams %R ${Math.round(t.willR)}`}
            />
            <GroupRow
              label="Volume dan posisi"
              vote={technical.groups.volume}
              detail={`OBV ${t.obvRising ? "naik" : "turun"}, CMF ${t.cmf >= 0 ? "positif" : "negatif"}, harga ${t.close > t.poc ? "di atas" : "di bawah"} POC`}
            />
          </ul>
        </div>
      )}
    </div>
  );
}

/** Satu kartu koin. Lebarnya ikut kolom grid, dan isinya menyesuaikan lewat container query. */
function Tile({
  card,
  chartOn,
  density,
  onRemove,
}: {
  card: FuturesCard;
  chartOn: boolean;
  density: Density;
  onRemove: (symbol: string) => void;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [chartVenue, setChartVenue] = useState<Venue>(card.venue);

  const venues: Venue[] = [];
  if (card.spotSymbol) venues.push("spot");
  if (card.futuresSymbol) venues.push("futures");
  const activeVenue = venues.includes(chartVenue) ? chartVenue : (venues[0] ?? card.venue);
  const chartSymbol = (activeVenue === "spot" ? card.spotSymbol : card.futuresSymbol) ?? card.symbol;

  const meta = BIAS_META[card.bias];
  const Icon = meta.icon;
  const conv = Math.round(card.conviction * 100);
  const change = card.metrics.priceChange24h;

  const source = !card.ok
    ? null
    : `Harga dari Binance ${VENUE_LABEL[card.venue]}${
        card.hasFutures ? (card.venue === "spot" ? ", derivatif dari Binance Futures" : "") : ", tanpa kontrak futures"
      }`;
  const unitNote = card.ok && card.venue === "futures" && card.multiplier > 1 ? `Harga per ${card.multiplier.toLocaleString("id-ID")} ${card.label}` : null;

  return (
    <article
      className="@container flex min-w-0 flex-col gap-4 overflow-hidden rounded-[28px] border p-4 sm:p-5"
      style={heroStyle(card.bias, card.conviction)}
      aria-label={`Analisis ${card.label}`}
    >
      <header className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-medium">{card.label}</h2>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-base tabular-nums">{card.metrics.price === null ? "Harga belum tersedia" : unitPrice(card.metrics.price, "USD")}</span>
            {change !== null && <span className={`text-sm font-medium tabular-nums ${change >= 0 ? "up" : "down"}`}>{pct(change)}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Chip tone={meta.tone}>
            <Icon size={15} aria-hidden /> {card.bias}
          </Chip>
          <button
            type="button"
            aria-label={`Hapus ${card.label}`}
            onClick={() => onRemove(card.symbol)}
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 text-[var(--muted)] hover:text-[var(--text)]"
          >
            <X size={15} aria-hidden />
          </button>
        </div>
      </header>

      {card.ok && (
        <>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {venues.map((v) => (
              <Chip key={v} tone="info">
                {VENUE_LABEL[v]}
              </Chip>
            ))}
            {source && <span className="min-w-0 text-xs leading-relaxed text-[var(--muted)]">{source}</span>}
          </div>
          {unitNote && <div className="-mt-2 text-xs text-[var(--muted)]">{unitNote}</div>}

          {chartOn && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {venues.length > 1 &&
                  venues.map((v) => (
                    <button key={v} type="button" className="pill !min-h-[32px] !px-3 !py-1.5 !text-xs" data-active={activeVenue === v} onClick={() => setChartVenue(v)}>
                      {VENUE_LABEL[v]}
                    </button>
                  ))}
                <a href={tvLink(chartSymbol, activeVenue)} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)]">
                  Buka di TradingView
                </a>
              </div>
              <TradingViewChart symbol={chartSymbol} venue={activeVenue} height={CHART_HEIGHT[density]} />
            </div>
          )}
        </>
      )}

      <div className="flex items-center gap-3">
        <span className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl ${TONE_CLASS[meta.tone]}`}>
          <Icon size={22} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-2xl font-medium leading-none">{card.bias}</span>
            <span className="text-xs text-[var(--muted)]">
              Keyakinan {convictionLabel(card.conviction)}
              {card.bias !== "NETRAL" ? ` ${conv}%` : ""}
            </span>
          </div>
          {card.bias !== "NETRAL" && (
            <div
              role="meter"
              aria-label="Keyakinan sinyal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={conv}
              aria-valuetext={`${conv} persen, ${convictionLabel(card.conviction)}`}
              className="mt-2 h-1.5 w-full rounded-full bg-white/10"
            >
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${conv}%`, background: card.bias === "LONG" ? "var(--up)" : "var(--down)" }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-sm leading-relaxed">{card.reason}</p>
        {card.ok && <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{meta.tip}</p>}
        {card.error && <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">Rincian teknis: {card.error}</p>}
      </div>

      {card.ok && (
        <div className="border-t border-white/10 pt-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm text-[var(--accent)]"
            aria-expanded={detailOpen}
            aria-controls={`detail-${card.symbol}`}
            onClick={() => setDetailOpen((v) => !v)}
          >
            {detailOpen ? "Sembunyikan detail analisis" : "Lihat detail analisis"}
            <ChevronDown size={16} aria-hidden className={`transition-transform ${detailOpen ? "rotate-180" : ""}`} />
          </button>
          <div id={`detail-${card.symbol}`} hidden={!detailOpen} className="mt-4">
            {detailOpen && <Details card={card} />}
          </div>
        </div>
      )}
    </article>
  );
}

function SearchBox({
  catalog,
  catalogReady,
  watch,
  onAdd,
}: {
  catalog: Catalog | null;
  catalogReady: boolean;
  watch: string[];
  onAdd: (symbol: string) => string | null;
}) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const suggestions = useMemo(() => (catalog ? searchCatalog(catalog, query) : []), [catalog, query]);
  const normalized = normalizeQuery(query);
  const inList = (symbol: string) => watch.some((w) => stripMultiplier(w) === stripMultiplier(symbol));

  const add = (symbol: string) => {
    const error = onAdd(symbol);
    setMessage(error);
    if (!error) setQuery("");
  };

  const submit = () => {
    if (!normalized) return;
    if (suggestions.length) return add(suggestions[0].symbol);
    if (!catalog) return add(normalized.endsWith("USDT") && normalized.length > 4 ? normalized : `${normalized}USDT`);
    setMessage("Koin tidak ditemukan di Binance Spot maupun Futures.");
  };

  return (
    <section id="futures-search-panel" className="card p-4 sm:p-6">
      <label htmlFor="futures-search" className="text-lg">
        Cari koin
      </label>
      <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
        Data utama dari Binance Spot. Kalau koinnya tidak ada di Spot, dipakai data Binance Futures. Memecoin yang listing di Binance ikut didukung, dan maksimal {MAX_WATCH} koin.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          id="futures-search"
          value={query}
          maxLength={24}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Contoh: BTC, PEPE, SOL"
          onChange={(e) => {
            setQuery(e.target.value);
            setMessage(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          className="min-h-[44px] min-w-0 flex-1 rounded-full border border-white/20 bg-transparent px-5 text-base text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />
        <button type="button" className="btn btn-primary" onClick={submit}>
          Tambah
        </button>
      </div>

      {message && <p className="mt-3 text-sm text-[var(--down)]">{message}</p>}
      {!catalogReady && <p className="mt-3 text-sm text-[var(--muted)]">Memuat daftar koin...</p>}
      {catalogReady && !catalog && (
        <p className="mt-3 text-sm text-[var(--muted)]">Daftar koin belum termuat. Tulis kode koin lalu tekan Tambah, kami cek langsung ke Binance.</p>
      )}

      {suggestions.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-3">
          {suggestions.map((s) => (
            <li key={s.symbol}>
              <button
                type="button"
                className="pill"
                disabled={inList(s.symbol)}
                onClick={() => add(s.symbol)}
                aria-label={`Tambah ${s.base}, ${VENUE_LABEL[s.venue]}${s.hasFutures && s.venue === "spot" ? " dan Futures" : ""}`}
              >
                {s.base}
                <span className="text-[var(--muted)]">
                  {VENUE_LABEL[s.venue]}
                  {s.hasFutures && s.venue === "spot" ? " dan Futures" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {catalog && normalized && suggestions.length === 0 && <p className="mt-3 text-sm text-[var(--muted)]">Tidak ada koin yang cocok.</p>}
    </section>
  );
}

export function FuturesView() {
  const [watch, setWatch] = useState<string[] | null>(null);
  const [data, setData] = useState<FuturesSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogReady, setCatalogReady] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chartOn, setChartOn] = useState(true);
  const [density, setDensity] = useState<Density>("sedang");
  const [refreshing, setRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const loader = useRef<(fresh: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    setWatch(loadWatch());
    setSearchOpen(readFlag(SEARCH_KEY, false));
    setChartOn(readFlag(CHART_KEY, true));
    setDensity(readDensity());
    let active = true;
    fetchCatalog().then((c) => {
      if (!active) return;
      setCatalog(c);
      setCatalogReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const key = watch ? watch.join(",") : null;

  useEffect(() => {
    if (!watch || key === null) return;
    if (!watch.length) {
      setData({ cards: [], updatedAt: Date.now() });
      setFailed(false);
      return;
    }
    let active = true;
    const load = async (fresh: boolean) => {
      try {
        const json = await getFuturesSentiment(watch, { fresh });
        if (!active) return;
        setData(json);
        setFailed(!json.cards.some((c) => c.ok));
      } catch {
        if (active) setFailed(true);
      }
    };
    loader.current = load;
    load(false);
    const timer = setInterval(() => load(false), 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const refresh = async () => {
    if (refreshing || cooldown > 0) return;
    setRefreshing(true);
    await loader.current(true);
    setRefreshing(false);
    setCooldown(REFRESH_COOLDOWN_S);
  };

  const update = (next: string[]) => {
    setWatch(next);
    saveWatch(next);
  };

  const add = (symbol: string): string | null => {
    if (!watch) return null;
    const clean = sanitizeWatch([symbol])[0];
    if (!clean) return "Kode koin tidak valid.";
    if (watch.some((w) => stripMultiplier(w) === stripMultiplier(clean))) return "Koin ini sudah ada di daftar.";
    if (watch.length >= MAX_WATCH) return `Maksimal ${MAX_WATCH} koin, hapus salah satu dulu.`;
    update([clean, ...watch]);
    setSearchOpen(false);
    writeFlag(SEARCH_KEY, false);
    return null;
  };

  const remove = (symbol: string) => {
    if (watch) update(watch.filter((s) => s !== symbol));
  };

  const toggleSearch = () => {
    setSearchOpen((v) => {
      writeFlag(SEARCH_KEY, !v);
      return !v;
    });
  };

  const toggleChart = () => {
    setChartOn((v) => {
      writeFlag(CHART_KEY, !v);
      return !v;
    });
  };

  const chooseDensity = (next: Density) => {
    setDensity(next);
    try {
      window.localStorage.setItem(DENSITY_KEY, next);
    } catch {
      return;
    }
  };

  const cards = data && watch ? watch.map((s) => data.cards.find((c) => c.symbol === s)).filter((c): c is FuturesCard => Boolean(c)) : [];
  const time = data ? new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(new Date(data.updatedAt)) : null;

  // Kartu makin kecil seiring bertambahnya koin, dengan batas bawah supaya tetap terbaca.
  const shrink = Math.max(0.72, 1 - 0.05 * Math.max(0, cards.length - 1));
  const tileMin = Math.round(TILE_MIN[density] * shrink);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="pill"
          data-active={searchOpen}
          aria-expanded={searchOpen}
          aria-controls="futures-search-panel"
          onClick={toggleSearch}
        >
          <Search size={16} aria-hidden /> Cari koin
          <span className="text-[var(--muted)]">
            {watch ? watch.length : 0} dari {MAX_WATCH}
          </span>
        </button>

        <div role="group" aria-label="Ukuran kartu" className="flex flex-wrap items-center gap-2">
          {DENSITIES.map((d) => (
            <button key={d} type="button" className="pill !min-h-[38px] !px-4" data-active={density === d} aria-pressed={density === d} onClick={() => chooseDensity(d)}>
              {DENSITY_LABEL[d]}
            </button>
          ))}
        </div>

        <button type="button" className="pill" aria-pressed={chartOn} onClick={toggleChart}>
          {chartOn ? "Sembunyikan chart" : "Tampilkan chart"}
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          {time && <span className="text-sm text-[var(--muted)]">Diperbarui {time}</span>}
          <button type="button" className="pill" onClick={refresh} disabled={refreshing || cooldown > 0 || !watch?.length}>
            <RefreshCw size={16} aria-hidden className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Memperbarui" : cooldown > 0 ? `Tunggu ${cooldown} detik` : "Perbarui"}
          </button>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {refreshing ? "Memperbarui data" : time ? `Data diperbarui ${time}` : ""}
      </p>

      {searchOpen && <SearchBox catalog={catalog} catalogReady={catalogReady} watch={watch ?? []} onAdd={add} />}

      {!data ? (
        <div role="status" aria-live="polite" aria-busy="true" className="card p-6">
          <span className="sr-only">Memuat data futures</span>
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-[320px] w-full" />
            <Skeleton className="h-[320px] w-full" />
          </div>
        </div>
      ) : (
        <>
          {cards.length === 0 ? (
            <div className="card p-6 text-base text-[var(--muted)]">Belum ada koin. Buka Cari koin untuk mulai.</div>
          ) : (
            <ul
              aria-label="Daftar analisis koin"
              className="grid items-start gap-4"
              style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${tileMin}px, 100%), 1fr))` }}
            >
              {cards.map((c) => (
                <li key={c.symbol} className="min-w-0">
                  <Tile card={c} chartOn={chartOn} density={density} onRemove={remove} />
                </li>
              ))}
            </ul>
          )}

          {failed && cards.length > 0 && (
            <div className="card p-6 text-base leading-relaxed">
              Perangkatmu belum bisa menjangkau Binance. Cek koneksi atau VPN, lalu data dicoba lagi otomatis tiap menit.
            </div>
          )}
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Data dari Binance lewat koneksi perangkatmu, disimpan sementara di browser dan diperbarui tiap menit. Chart oleh TradingView. Sinyal ini alat bantu screening, bukan ajakan membeli atau menjual.
          </p>
        </>
      )}
    </>
  );
}
