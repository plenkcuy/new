"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { AssetIcon } from "@/components/asset-icon";
import { StatCard } from "@/components/ui";
import { convRate } from "@/lib/journal-calc";
import {
  CLASS_COLOR,
  CLASS_LABEL,
  IDX_LOT,
  decimal,
  money,
  num,
  pct,
  quantity,
  unitPrice,
  type Ccy,
  type LivePosition,
  type LiveQuote,
} from "@/lib/shared";
import { AllocationChart } from "./journal-widgets";

const WS_HOSTS = ["wss://stream.binance.com:9443", "wss://data-stream.binance.vision"];
const FLUSH_MS = 500;
const WS_FRESH_MS = 5000;

type Props = {
  positions: LivePosition[];
  realized: number;
  usdIdr: number;
  report: Ccy;
  /** Premium: harga crypto lewat WebSocket Binance. */
  realtime: boolean;
  pollMs: number;
  upgradeHref: string;
  /** Kurva ekuitas dari server, ditampilkan di samping alokasi. */
  children: ReactNode;
};

type PriceState = Record<number, LiveQuote>;

export function LivePortfolio({ positions, realized, usdIdr: initialFx, report, realtime, pollMs, upgradeHref, children }: Props) {
  const [quotes, setQuotes] = useState<PriceState>({});
  const [usdIdr, setUsdIdr] = useState(initialFx);
  const [wsOpen, setWsOpen] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const wsStamp = useRef<Map<number, number>>(new Map());

  const streams = useMemo(() => {
    const bySymbol = new Map<string, number[]>();
    for (const p of positions) {
      if (!p.stream) continue;
      bySymbol.set(p.stream.toUpperCase(), [...(bySymbol.get(p.stream.toUpperCase()) ?? []), p.assetId]);
    }
    return bySymbol;
  }, [positions]);

  /* ---------- Polling: saham IDX, saham US, meme coin, kurs (dan crypto sebagai cadangan) ---------- */
  useEffect(() => {
    if (positions.length === 0) return;
    let stopped = false;

    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/prices", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { usdIdr: number | null; quotes: Record<string, LiveQuote> };
        if (stopped) return;

        const now = Date.now();
        setQuotes((prev) => {
          const next = { ...prev };
          for (const [id, quote] of Object.entries(data.quotes)) {
            const assetId = Number(id);
            if ((wsStamp.current.get(assetId) ?? 0) > now - WS_FRESH_MS) continue;
            next[assetId] = quote;
          }
          return next;
        });
        if (data.usdIdr) setUsdIdr(data.usdIdr);
        setUpdatedAt(now);
        setFailed(false);
      } catch {
        if (!stopped) setFailed(true);
      }
    };

    const first = setTimeout(tick, 1500);
    const timer = setInterval(tick, pollMs);
    const onVisible = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [positions.length, pollMs]);

  /* ---------- WebSocket Binance spot (Premium) ---------- */
  useEffect(() => {
    if (!realtime || streams.size === 0) return;

    const pending = new Map<string, LiveQuote>();
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let attempt = 0;

    const url = (host: string) =>
      `${host}/stream?streams=${[...streams.keys()].map((s) => `${s.toLowerCase()}@miniTicker`).join("/")}`;

    const connect = () => {
      socket = new WebSocket(url(WS_HOSTS[attempt % WS_HOSTS.length]));

      socket.onopen = () => {
        attempt = 0;
        setWsOpen(true);
      };
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data))?.data;
          const close = Number(data?.c);
          const open = Number(data?.o);
          if (typeof data?.s !== "string" || !(close > 0)) return;
          pending.set(data.s, { price: close, changePct: open > 0 ? (close / open - 1) * 100 : null, source: "binance" });
        } catch {
          // Pesan yang bukan JSON diabaikan.
        }
      };
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        setWsOpen(false);
        if (stopped) return;
        attempt += 1;
        retry = setTimeout(connect, Math.min(30_000, 1000 * 2 ** attempt));
      };
    };

    connect();

    const flush = setInterval(() => {
      if (pending.size === 0) return;
      const now = Date.now();
      const batch = new Map(pending);
      pending.clear();
      setQuotes((prev) => {
        const next = { ...prev };
        for (const [symbol, quote] of batch) {
          for (const assetId of streams.get(symbol) ?? []) {
            next[assetId] = quote;
            wsStamp.current.set(assetId, now);
          }
        }
        return next;
      });
      setUpdatedAt(now);
    }, FLUSH_MS);

    return () => {
      stopped = true;
      clearTimeout(retry);
      clearInterval(flush);
      socket?.close();
    };
  }, [realtime, streams]);

  /* ---------- Hitung ulang nilai dari harga terbaru ---------- */
  const rows = useMemo(() => {
    const list = positions.map((p) => {
      const live = quotes[p.assetId];
      const price = live?.price ?? p.price;
      const value = p.qty * price * convRate(p.ccy, report, usdIdr);
      const unrealized = value - p.costReport;
      return {
        ...p,
        price,
        changePct: live ? live.changePct : p.changePct,
        source: live?.source ?? p.source,
        fromTrade: p.priceFromTrade && !live,
        value,
        unrealized,
        unrealizedPct: p.costReport > 0 ? (unrealized / p.costReport) * 100 : 0,
        share: 0,
      };
    });
    const total = list.reduce((sum, r) => sum + r.value, 0);
    for (const r of list) r.share = total > 0 ? (r.value / total) * 100 : 0;
    return list.sort((a, b) => b.value - a.value);
  }, [positions, quotes, usdIdr, report]);

  const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
  const totalCost = rows.reduce((sum, r) => sum + r.costReport, 0);
  const unrealized = totalValue - totalCost;

  const slices = useMemo(() => {
    const byClass = new Map<keyof typeof CLASS_LABEL, number>();
    for (const r of rows) byClass.set(r.assetClass, (byClass.get(r.assetClass) ?? 0) + r.value);
    return [...byClass.entries()]
      .map(([cls, value]) => ({
        label: CLASS_LABEL[cls],
        value,
        share: totalValue > 0 ? (value / totalValue) * 100 : 0,
        color: CLASS_COLOR[cls],
      }))
      .sort((a, b) => b.value - a.value);
  }, [rows, totalValue]);

  const clock = updatedAt
    ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(updatedAt)
    : null;

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Nilai portofolio" value={money(totalValue, report)} hint={`Modal ${money(totalCost, report)}`} />
        <StatCard
          label="Untung rugi belum terealisasi"
          value={money(unrealized, report)}
          hint={pct(totalCost > 0 ? (unrealized / totalCost) * 100 : 0)}
          tone={unrealized >= 0 ? "up" : "down"}
        />
        <StatCard label="Untung rugi terealisasi" value={money(realized, report)} tone={realized >= 0 ? "up" : "down"} />
        <StatCard label="Kurs USD ke IDR" value={`Rp ${num(Math.round(usdIdr))}`} hint={`${num(rows.length)} posisi terbuka`} />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
        {realtime && wsOpen ? (
          <span className="pill" data-active="true">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden /> Realtime Binance
          </span>
        ) : (
          <span className="pill">
            <span className={`h-2 w-2 rounded-full ${failed ? "bg-red-400" : "bg-[var(--muted)]"}`} aria-hidden />
            {failed ? "Gagal memuat harga terbaru" : clock ? `Diperbarui ${clock} WIB` : "Memuat harga"}
          </span>
        )}
        {!realtime && (
          <Link href={upgradeHref} className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline">
            <Lock size={12} /> Realtime khusus Premium
          </Link>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        {children}
        <AllocationChart slices={slices} report={report} />
      </div>

      <section className="card overflow-x-auto">
        <h2 className="p-6 pb-2 text-lg">Posisi terbuka</h2>
        {rows.length === 0 ? (
          <p className="p-6 pt-2 text-sm text-[var(--muted)]">
            Belum ada posisi. Catat transaksi beli di halaman{" "}
            <Link href="/journal" className="text-[var(--accent)] hover:underline">
              Jurnal
            </Link>{" "}
            dan portofolio terisi otomatis.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Aset</th>
                <th className="num">Jumlah</th>
                <th className="num">Harga rata rata</th>
                <th className="num">Harga</th>
                <th className="num">Nilai</th>
                <th className="num">Untung rugi</th>
                <th className="num">Alokasi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.assetId}>
                  <td>
                    <div className="flex items-center gap-3">
                      <AssetIcon symbol={r.symbol} color={CLASS_COLOR[r.assetClass]} icon={r.icon} size={32} />
                      <div>
                        <div>{r.symbol}</div>
                        <div className="text-[11px] text-[var(--muted)]">{CLASS_LABEL[r.assetClass]}</div>
                      </div>
                    </div>
                  </td>
                  <td className="num">{r.assetClass === "idx" ? `${num(r.qty / IDX_LOT)} lot` : quantity(r.qty)}</td>
                  <td className="num">{unitPrice(r.avgPrice, r.ccy)}</td>
                  <td className="num" title={r.source ? `Sumber: ${r.source}` : undefined}>
                    {unitPrice(r.price, r.ccy)}
                    {r.changePct !== null && <div className={`text-[11px] ${r.changePct >= 0 ? "up" : "down"}`}>{pct(r.changePct)}</div>}
                    {r.fromTrade && (
                      <div className="mt-1">
                        <span className="badge badge-free" title="Harga terkini belum tersedia, memakai harga transaksi terakhir">
                          dari transaksi
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="num">{money(r.value, report)}</td>
                  <td className={`num ${r.unrealized >= 0 ? "up" : "down"}`}>
                    {money(r.unrealized, report)}
                    <div className="text-[11px]">{pct(r.unrealizedPct)}</div>
                  </td>
                  <td className="num">{decimal(r.share, 1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
