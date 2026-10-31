"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getFuturesSentiment, type FuturesCard, type FuturesSnapshot } from "@/lib/futures/analyze";
import type { Bias, Vote } from "@/lib/futures/engine";
import { fetchCatalog } from "@/lib/futures/feed";
import {
  DEFAULT_WATCH,
  MAX_WATCH,
  baseOf,
  normalizeQuery,
  sanitizeWatch,
  searchCatalog,
  type Catalog,
  type Venue,
} from "@/lib/futures/symbols";
import { chartDoc, tvLink } from "@/lib/futures/tradingview";
import { pct, unitPrice } from "@/lib/shared";

type Tone = "up" | "down" | "flat" | "info";

const TONE_CLASS: Record<Tone, string> = {
  up: "bg-[color-mix(in_srgb,var(--up)_16%,transparent)] text-[var(--up)]",
  down: "bg-[color-mix(in_srgb,var(--down)_16%,transparent)] text-[var(--down)]",
  flat: "bg-white/10 text-[var(--muted)]",
  info: "bg-white/10 text-[var(--text)]",
};

const WATCH_KEY = "lumen:futures:watch:v1";
const VENUE_LABEL: Record<Venue, string> = { spot: "Spot", futures: "Futures" };

const biasTone = (bias: Bias): Tone => (bias === "LONG" ? "up" : bias === "SHORT" ? "down" : "flat");
const voteTone = (vote: Vote): Tone => (vote === 1 ? "up" : vote === -1 ? "down" : "flat");
const voteLabel = (vote: Vote) => (vote === 1 ? "Naik" : vote === -1 ? "Turun" : "Netral");
const pointTone = (point: number): Tone => (point > 0 ? "up" : point < 0 ? "down" : "flat");
const pointLabel = (point: number) => (point > 0 ? `+${point}` : String(point));

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

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-sm font-medium leading-none ${TONE_CLASS[tone]}`}>
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
    <li className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-base text-[var(--muted)]">{label}</span>
          <span className="text-base font-medium">{value}</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{note}</p>
      </div>
      <Chip tone={pointTone(point)}>{pointLabel(point)}</Chip>
    </li>
  );
}

function GroupRow({ label, vote, detail }: { label: string; vote: Vote; detail: string }) {
  return (
    <li className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <div className="text-base font-medium">{label}</div>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{detail}</p>
      </div>
      <Chip tone={voteTone(vote)}>{voteLabel(vote)}</Chip>
    </li>
  );
}

function TradingViewChart({ symbol, venue }: { symbol: string; venue: Venue }) {
  const doc = useMemo(() => chartDoc(symbol, venue), [symbol, venue]);
  return (
    <iframe
      key={`${symbol}:${venue}`}
      title={`Chart TradingView ${baseOf(symbol)} ${VENUE_LABEL[venue]}`}
      srcDoc={doc}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      loading="lazy"
      className="h-[420px] w-full rounded-2xl border border-[var(--line)]"
    />
  );
}

function Card({ card, onRemove }: { card: FuturesCard; onRemove: (symbol: string) => void }) {
  const { metrics, derivatives, technical } = card;
  const t = technical?.input;
  const [chartOpen, setChartOpen] = useState(false);
  const [chartVenue, setChartVenue] = useState<Venue>(card.venue);

  const venues: Venue[] = card.venue === "spot" ? (card.hasFutures ? ["spot", "futures"] : ["spot"]) : ["futures"];
  const activeVenue = venues.includes(chartVenue) ? chartVenue : venues[0];

  const source = !card.ok
    ? null
    : `Harga dari Binance ${VENUE_LABEL[card.venue]}${
        card.hasFutures ? (card.venue === "spot" ? ", derivatif dari Binance Futures" : "") : ", tanpa kontrak futures"
      }`;

  return (
    <section className="card flex flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl font-medium">{card.label}</span>
            {card.ok && venues.map((v) => <Chip key={v} tone="info">{VENUE_LABEL[v]}</Chip>)}
          </div>
          <div className="mt-1 text-base text-[var(--muted)]">
            {metrics.price === null ? "Harga belum tersedia" : unitPrice(metrics.price, "USD")}
          </div>
          {source && <div className="mt-1 text-sm text-[var(--muted)]">{source}</div>}
        </div>
        <div className="flex items-center gap-3">
          <Chip tone={biasTone(card.bias)}>{card.bias}</Chip>
          <button
            type="button"
            aria-label={`Hapus ${card.label}`}
            onClick={() => onRemove(card.symbol)}
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 text-[var(--muted)] hover:text-[var(--text)]"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      </header>

      <p className="text-base leading-relaxed">{card.reason}</p>

      {card.error && <p className="text-sm leading-relaxed text-[var(--muted)]">Rincian teknis: {card.error}</p>}

      {derivatives && (
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg">Screening derivatif</h3>
            <span className={`text-base font-medium ${derivatives.total > 0 ? "up" : derivatives.total < 0 ? "down" : "text-[var(--muted)]"}`}>
              Skor {pointLabel(derivatives.total)}
            </span>
          </div>
          <ul className="mt-2 divide-y divide-[var(--line)]">
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
      )}

      {technical && t && (
        <div>
          <h3 className="text-lg">Konfluensi teknikal harian</h3>
          <ul className="mt-2 divide-y divide-[var(--line)]">
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

      {card.ok && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="pill" data-active={chartOpen} onClick={() => setChartOpen((v) => !v)}>
              {chartOpen ? "Sembunyikan chart" : "Tampilkan chart"}
            </button>
            {chartOpen &&
              venues.length > 1 &&
              venues.map((v) => (
                <button key={v} type="button" className="pill" data-active={activeVenue === v} onClick={() => setChartVenue(v)}>
                  {VENUE_LABEL[v]}
                </button>
              ))}
            {chartOpen && (
              <a
                href={tvLink(card.symbol, activeVenue)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--accent)]"
              >
                Buka di TradingView
              </a>
            )}
          </div>
          {chartOpen && <TradingViewChart symbol={card.symbol} venue={activeVenue} />}
        </div>
      )}
    </section>
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
    <section className="card p-6">
      <label htmlFor="futures-search" className="text-lg">
        Cari koin
      </label>
      <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
        Data utama dari Binance Spot. Kalau koinnya tidak ada di Spot, dipakai data Binance Futures. Maksimal {MAX_WATCH} koin.
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
                disabled={watch.includes(s.symbol)}
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
      {catalog && normalized && suggestions.length === 0 && (
        <p className="mt-3 text-sm text-[var(--muted)]">Tidak ada koin yang cocok.</p>
      )}
    </section>
  );
}

export function FuturesView() {
  const [watch, setWatch] = useState<string[] | null>(null);
  const [data, setData] = useState<FuturesSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogReady, setCatalogReady] = useState(false);
  const saved = useRef(false);

  useEffect(() => {
    setWatch(loadWatch());
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
    const load = async () => {
      try {
        const json = await getFuturesSentiment(watch);
        if (!active) return;
        setData(json);
        setFailed(!json.cards.some((c) => c.ok));
        if (!saved.current && json.cards.some((c) => c.ok)) {
          saved.current = true;
          fetch("/api/futures/snapshot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cards: json.cards
                .filter((c) => c.ok)
                .map((c) => ({ symbol: c.symbol, bias: c.bias, derivativeScore: c.derivatives?.total ?? null })),
            }),
          }).catch(() => {});
        }
      } catch {
        if (active) setFailed(true);
      }
    };
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = (next: string[]) => {
    setWatch(next);
    saveWatch(next);
  };

  const add = (symbol: string): string | null => {
    if (!watch) return null;
    const clean = sanitizeWatch([symbol])[0];
    if (!clean) return "Kode koin tidak valid.";
    if (watch.includes(clean)) return "Koin ini sudah ada di daftar.";
    if (watch.length >= MAX_WATCH) return `Maksimal ${MAX_WATCH} koin, hapus salah satu dulu.`;
    update([clean, ...watch]);
    return null;
  };

  const remove = (symbol: string) => {
    if (watch) update(watch.filter((s) => s !== symbol));
  };

  const time = data ? new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(new Date(data.updatedAt)) : null;
  const ordered = data && watch ? watch.map((s) => data.cards.find((c) => c.symbol === s)).filter((c): c is FuturesCard => Boolean(c)) : [];

  return (
    <>
      <SearchBox catalog={catalog} catalogReady={catalogReady} watch={watch ?? []} onAdd={add} />

      {!data ? (
        <div className="card p-6 text-base text-[var(--muted)]">Memuat data futures...</div>
      ) : (
        <>
          {ordered.length === 0 ? (
            <div className="card p-6 text-base text-[var(--muted)]">Belum ada koin. Cari koin di atas untuk mulai.</div>
          ) : (
            <div className="grid items-stretch gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {ordered.map((card) => (
                <Card key={card.symbol} card={card} onRemove={remove} />
              ))}
            </div>
          )}
          {failed && ordered.length > 0 && (
            <div className="card p-6 text-base leading-relaxed">
              Perangkatmu belum bisa menjangkau Binance. Cek koneksi atau VPN, lalu data dicoba lagi otomatis tiap menit.
            </div>
          )}
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Data dari Binance lewat koneksi perangkatmu, disimpan sementara di browser dan diperbarui tiap menit (terakhir {time}). Chart oleh TradingView. Sinyal ini alat bantu
            screening, bukan ajakan membeli atau menjual.
          </p>
        </>
      )}
    </>
  );
}
