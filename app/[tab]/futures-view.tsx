"use client";

import { useEffect, useState } from "react";
import { pct, unitPrice } from "@/lib/shared";
import type { FuturesCard, FuturesSnapshot } from "@/lib/futures/analyze";
import type { Bias, Vote } from "@/lib/futures/engine";

type Tone = "up" | "down" | "flat";

const TONE_CLASS: Record<Tone, string> = {
  up: "bg-[color-mix(in_srgb,var(--up)_16%,transparent)] text-[var(--up)]",
  down: "bg-[color-mix(in_srgb,var(--down)_16%,transparent)] text-[var(--down)]",
  flat: "bg-white/10 text-[var(--muted)]",
};

const biasTone = (bias: Bias): Tone => (bias === "LONG" ? "up" : bias === "SHORT" ? "down" : "flat");
const voteTone = (vote: Vote): Tone => (vote === 1 ? "up" : vote === -1 ? "down" : "flat");
const voteLabel = (vote: Vote) => (vote === 1 ? "Naik" : vote === -1 ? "Turun" : "Netral");
const pointTone = (point: number): Tone => (point > 0 ? "up" : point < 0 ? "down" : "flat");
const pointLabel = (point: number) => (point > 0 ? `+${point}` : String(point));

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

function Card({ card }: { card: FuturesCard }) {
  const { metrics, derivatives, technical } = card;
  const t = technical?.input;

  return (
    <section className="card flex flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-medium">{card.label}</div>
          <div className="mt-1 text-base text-[var(--muted)]">
            {metrics.price === null ? "Harga belum tersedia" : unitPrice(metrics.price, "USD")}
          </div>
        </div>
        <Chip tone={biasTone(card.bias)}>{card.bias}</Chip>
      </header>

      <p className="text-base leading-relaxed">{card.reason}</p>

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
            <Row
              label="Funding Rate"
              value={fundingText(metrics.funding)}
              point={derivatives.funding.point}
              note={derivatives.funding.text}
            />
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
    </section>
  );
}

export function FuturesView() {
  const [data, setData] = useState<FuturesSnapshot | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/futures", { cache: "no-store" });
        if (!res.ok) throw new Error("gagal");
        const json = (await res.json()) as FuturesSnapshot;
        if (active) {
          setData(json);
          setFailed(false);
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
  }, []);

  if (!data) {
    return (
      <div className="card p-6 text-base text-[var(--muted)]">
        {failed ? "Data futures belum bisa dimuat. Coba muat ulang halaman sebentar lagi." : "Memuat data futures..."}
      </div>
    );
  }

  const time = new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(new Date(data.updatedAt));

  return (
    <>
      <div className="grid items-stretch gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {data.cards.map((card) => (
          <Card key={card.symbol} card={card} />
        ))}
      </div>
      <p className="text-sm leading-relaxed text-[var(--muted)]">
        Data dari Binance Futures, diperbarui tiap menit (terakhir {time}). Sinyal ini alat bantu screening, bukan ajakan membeli atau menjual.
      </p>
    </>
  );
}
