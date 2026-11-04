"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { addTrade } from "@/lib/journal-actions";
import { deniedRedirect } from "@/lib/access";
import type { AssetHit } from "@/lib/asset-search";
import { AssetCombobox } from "./asset-combobox";
import { previewPnl, toWibInput } from "@/lib/journal-input";
import type { CloseTarget } from "@/lib/journal";
import {
  ASSET_CLASSES,
  CHAINS,
  CHAIN_LABEL,
  CLASS_LABEL,
  EMOTIONS,
  IDX_LOT,
  money,
  type AssetClass,
  type Ccy,
  type Chain,
  type Direction,
  type JournalFormState,
} from "@/lib/shared";

const field =
  "w-full rounded-2xl border border-[var(--line)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-40";
const label = "mb-1.5 block text-xs text-[var(--muted)]";

const INITIAL: JournalFormState = { ok: false };

/** Angka tanpa notasi eksponen, supaya aman dimasukkan ke kolom input. */
const plain = (n: number) => n.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 18 });

/** Teks angka dari input (boleh koma desimal) menjadi number. NaN bila kosong atau bukan angka. */
const toNum = (raw: string) => (raw.trim() === "" ? NaN : Number(raw.replace(/\s/g, "").replace(",", ".")));
const optNum = (raw: string) => {
  const n = toNum(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const minus = (text: string) => text.replace(/-/g, "\u2212");

type LiveQuote = { price: number; changePct: number | null; source: string; t: number };
type MemeTarget = { chain: Chain; contract: string };
const SOURCE_LABEL: Record<string, string> = { pluang: "Pluang", stockbit: "Stockbit", reku: "Reku", binance: "Binance" };
const SEARCHABLE = ["idx", "us_stock", "crypto", "meme"] as const;
const isSearchable = (c: AssetClass): c is (typeof SEARCHABLE)[number] => (SEARCHABLE as readonly string[]).includes(c);

type Props = { used: number; limit: number | null; closeTarget?: CloseTarget | null };

export function TradeForm({ used, limit, closeTarget = null }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState(addTrade, INITIAL);
  const [, startTransition] = useTransition();

  // Menutup posisi yang sudah ada: kelas, simbol, jumlah, dan harga terisi dari posisinya.
  const initialUnit = closeTarget?.assetClass === "idx" && closeTarget.qty % IDX_LOT !== 0 ? "share" : "lot";
  const initialQty = closeTarget
    ? plain(closeTarget.assetClass === "idx" && initialUnit === "lot" ? closeTarget.qty / IDX_LOT : closeTarget.qty)
    : "";

  const [assetClass, setAssetClass] = useState<AssetClass>(closeTarget?.assetClass ?? "idx");
  const [direction, setDirection] = useState<Direction>(closeTarget?.direction ?? "long");
  const [action, setAction] = useState<"open" | "close">(closeTarget ? "close" : "open");
  const [closed, setClosed] = useState(false);
  const [riskStop, setRiskStop] = useState("");
  const [pnlMode, setPnlMode] = useState<"auto" | "manual">("auto");
  const [unit, setUnit] = useState<"lot" | "share">(initialUnit);
  const [qty, setQty] = useState(initialQty);
  const [price, setPrice] = useState(closeTarget ? plain(closeTarget.price) : "");
  const [symbol, setSymbol] = useState(closeTarget?.symbol ?? "");
  const [assetName, setAssetName] = useState("");
  const [priceMode, setPriceMode] = useState<"live" | "manual">(closeTarget ? "manual" : "live");
  const [liveQuote, setLiveQuote] = useState<LiveQuote | null>(null);
  const [quoteState, setQuoteState] = useState<"idle" | "loading" | "error">("idle");
  const quoteAbort = useRef<AbortController | null>(null);
  const [closePrice, setClosePrice] = useState("");
  const [fee, setFee] = useState("");
  const [feeClose, setFeeClose] = useState("");
  const [pnlManual, setPnlManual] = useState("");
  const [now, setNow] = useState("");
  const [chain, setChain] = useState<Chain>((CHAINS as readonly string[]).includes(closeTarget?.chain ?? "") ? (closeTarget?.chain as Chain) : "solana");
  const [contract, setContract] = useState<string>(closeTarget?.contract ?? "");

  // Meme coin butuh chain dan alamat kontrak untuk harga. Kosong berarti harga belum bisa diambil.
  const memeTarget: MemeTarget | undefined = assetClass === "meme" && contract ? { chain, contract } : undefined;

  useEffect(() => setNow(toWibInput(Date.now())), []);

  // Harga sekarang untuk kode aset terpilih, lewat scraper di server (dibatasi per pengguna).
  const fetchQuote = useCallback(
    async (cls: AssetClass, code: string, fill: boolean, meme?: MemeTarget) => {
      if (!isSearchable(cls) || !code.trim()) return;
      if (cls === "meme" && !meme) return;
      quoteAbort.current?.abort();
      const controller = new AbortController();
      quoteAbort.current = controller;
      setQuoteState("loading");
      try {
        const symbolParam = cls === "meme" ? code.trim() : code.trim().toUpperCase();
        const memeParams = meme ? `&chain=${meme.chain}&contract=${encodeURIComponent(meme.contract)}` : "";
        const res = await fetch(`/api/assets/quote?class=${cls}&symbol=${encodeURIComponent(symbolParam)}${memeParams}`, {
          signal: controller.signal,
          credentials: "same-origin",
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as LiveQuote & { name?: string | null };
        if (!(json.price > 0)) throw new Error("harga kosong");
        setLiveQuote({ price: json.price, changePct: json.changePct ?? null, source: json.source, t: json.t });
        if (json.name) setAssetName(json.name);
        if (fill) setPrice(plain(json.price));
        setQuoteState("idle");
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setLiveQuote(null);
        setQuoteState("error");
        setPriceMode("manual");
      }
    },
    [],
  );

  useEffect(() => () => quoteAbort.current?.abort(), []);

  const pickAsset = (hit: AssetHit) => {
    setSymbol(hit.symbol);
    setAssetName(hit.name ?? "");
    setLiveQuote(null);
    setQuoteState("idle");
    const meme = hit.chain && hit.contract ? { chain: hit.chain, contract: hit.contract } : undefined;
    if (meme) {
      setChain(meme.chain);
      setContract(meme.contract);
    }
    if (priceMode === "live" && hit.price) setPrice(plain(hit.price));
    fetchQuote(assetClass, hit.symbol, priceMode === "live", meme);
  };

  const typeSymbol = (value: string) => {
    setSymbol(value);
    setAssetName("");
    setLiveQuote(null);
    setQuoteState("idle");
    // Kode yang diketik ulang bisa berarti token lain, jadi alamat dari pilihan sebelumnya dikosongkan.
    if (assetClass === "meme") setContract("");
  };

  const changeClass = (next: AssetClass) => {
    if (next === assetClass) return;
    quoteAbort.current?.abort();
    setAssetClass(next);
    setContract("");
    setSymbol("");
    setAssetName("");
    setLiveQuote(null);
    setQuoteState("idle");
    setPrice("");
    setPriceMode("live");
  };

  const choosePriceMode = (mode: "live" | "manual") => {
    setPriceMode(mode);
    if (mode === "live" && isSearchable(assetClass) && symbol.trim()) {
      if (liveQuote) setPrice(plain(liveQuote.price));
      else fetchQuote(assetClass, symbol, true, memeTarget);
    }
  };

  // Setelah tersimpan: kosongkan isian. Bila berasal dari tombol Tutup, kembali ke jurnal biasa.
  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    setQty("");
    setPrice("");
    setSymbol("");
    setAssetName("");
    setLiveQuote(null);
    setQuoteState("idle");
    setPriceMode("live");
    setClosePrice("");
    setFee("");
    setFeeClose("");
    setPnlManual("");
    setRiskStop("");
    setClosed(false);
    setPnlMode("auto");
    setChain("solana");
    setContract("");
    if (closeTarget) router.replace("/journal", { scroll: false });
  }, [state, closeTarget, router]);

  const ccy: Ccy = assetClass === "idx" ? "IDR" : "USD";
  const quote = ccy === "IDR" ? "Rp" : "USD";
  const livePrice = priceMode === "live" && Boolean(liveQuote) && isSearchable(assetClass) && !closeTarget;
  // Long dibuka dengan beli dan ditutup dengan jual. Short sebaliknya.
  const side: "buy" | "sell" = (direction === "long") === (action === "open") ? "buy" : "sell";
  const closing = closed || action === "close";
  const lots = assetClass === "idx" && unit === "lot";
  const qtyUnits = toNum(qty) * (lots ? IDX_LOT : 1);

  const stopValue = optNum(riskStop) ?? closeTarget?.stop ?? null;

  const preview = useMemo(() => {
    if (!closing) return null;
    if (closed) {
      return previewPnl({
        assetClass,
        direction,
        kind: "roundtrip",
        qty: qtyUnits,
        entry: toNum(price),
        close: toNum(closePrice),
        feeEntry: optNum(fee),
        feeClose: optNum(feeClose),
        stop: optNum(riskStop),
      });
    }
    return previewPnl({
      assetClass,
      direction,
      kind: "close",
      qty: qtyUnits,
      close: toNum(price),
      avgPrice: closeTarget?.avgPrice,
      feeClose: optNum(fee),
      stop: stopValue,
    });
  }, [closing, closed, assetClass, direction, qtyUnits, price, closePrice, fee, feeClose, riskStop, stopValue, closeTarget?.avgPrice]);

  // Entry baru dibatasi paket. Menutup posisi (jual) tidak pernah dibatasi.
  const slots = closed ? 2 : 1;
  const blocked = action === "open" && limit !== null && used + slots > limit;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  };

  const priceLabel = closed ? "Harga entry" : action === "close" ? "Harga close" : "Harga";
  const timeLabel = closed ? "Waktu entry (WIB)" : action === "close" ? "Waktu close (WIB)" : "Waktu transaksi (WIB)";
  const submitLabel = pending ? "Menyimpan" : closed ? "Simpan entry dan close" : action === "close" ? "Simpan close" : "Simpan transaksi";

  return (
    <form ref={formRef} onSubmit={submit} className="flex flex-col gap-5 [color-scheme:dark]" key={closeTarget?.assetId ?? "baru"}>
      <input type="hidden" name="assetClass" value={assetClass} />
      <input type="hidden" name="assetName" value={assetName} />
      <input type="hidden" name="side" value={side} />
      <input type="hidden" name="direction" value={direction} />
      <input type="hidden" name="pnlMode" value={closing ? pnlMode : "auto"} />
      {closed && <input type="hidden" name="closed" value="on" />}

      {closeTarget ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card-soft)] p-4 text-sm">
          <span>
            Menutup posisi {closeTarget.direction === "short" ? "short" : "long"} <strong>{closeTarget.symbol}</strong>. Isian sudah dibuat dari posisimu, ubah jumlah bila hanya menutup sebagian.
          </span>
          <Link href="/journal" className="pill">
            Batal
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {ASSET_CLASSES.map((c) => (
            <button key={c} type="button" className="pill" data-active={assetClass === c} onClick={() => changeClass(c)}>
              {CLASS_LABEL[c]}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isSearchable(assetClass) ? (
          <AssetCombobox
            id="symbol"
            label="Kode aset"
            className={`${field} pr-10`}
            labelClassName={label}
            assetClass={assetClass}
            value={symbol}
            readOnly={Boolean(closeTarget)}
            placeholder={assetClass === "idx" ? "BBCA" : assetClass === "us_stock" ? "AAPL" : assetClass === "meme" ? "PEPE atau alamat kontrak" : "BTC"}
            keepCase={assetClass === "meme"}
            onChange={typeSymbol}
            onPick={pickAsset}
            onCommit={(value) => {
              if (priceMode === "live" && value.trim() && !liveQuote && quoteState !== "loading") fetchQuote(assetClass, value, true, memeTarget);
            }}
          />
        ) : (
          <div>
            <label className={label} htmlFor="symbol">
              Kode aset
            </label>
            <input
              id="symbol"
              name="symbol"
              required
              maxLength={20}
              autoComplete="off"
              className={field}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              readOnly={Boolean(closeTarget)}
              placeholder="BONK"
            />
          </div>
        )}

        <div>
          <span className={label}>Arah</span>
          <div className="flex gap-2">
            <button type="button" className="pill flex-1" data-active={direction === "long"} disabled={Boolean(closeTarget)} onClick={() => setDirection("long")}>
              Long
            </button>
            <button type="button" className="pill flex-1" data-active={direction === "short"} disabled={Boolean(closeTarget)} onClick={() => setDirection("short")}>
              Short
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="pill flex-1"
              data-active={action === "open"}
              disabled={Boolean(closeTarget)}
              onClick={() => setAction("open")}
            >
              Buka
            </button>
            <button
              type="button"
              className="pill flex-1"
              data-active={action === "close"}
              onClick={() => {
                setAction("close");
                setClosed(false);
              }}
            >
              Tutup
            </button>
          </div>
          <p className="mt-1.5 text-xs text-[var(--muted)]" data-testid="side-caption">
            Dicatat sebagai {side === "buy" ? "beli" : "jual"}
            {direction === "short" && action === "open" ? " (membuka short)" : ""}
            {direction === "short" && action === "close" ? " (cover short)" : ""}
          </p>
        </div>

        <div>
          <label className={label} htmlFor="qty">
            Jumlah
          </label>
          <div className="flex gap-2">
            <input
              id="qty"
              name="qty"
              required
              inputMode="decimal"
              autoComplete="off"
              className={field}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder={assetClass === "idx" ? "10" : "0,5"}
            />
            {assetClass === "idx" && (
              <select
                name="unit"
                className={`${field} w-28`}
                value={unit}
                onChange={(e) => setUnit(e.target.value === "share" ? "share" : "lot")}
                aria-label="Satuan jumlah"
              >
                <option value="lot">lot</option>
                <option value="share">lembar</option>
              </select>
            )}
          </div>
        </div>

        <div>
          <label className={label} htmlFor="price">
            {priceLabel} ({quote})
          </label>
          <input
            id="price"
            name="price"
            required
            inputMode="decimal"
            autoComplete="off"
            className={field}
            value={price}
            readOnly={livePrice}
            aria-readonly={livePrice}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={assetClass === "idx" ? "9850" : "0,00001234"}
          />
          {isSearchable(assetClass) && (
            <div className="mt-2">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="pill !min-h-[34px] !px-4 !py-2 !text-xs" data-active={priceMode === "live"} onClick={() => choosePriceMode("live")}>
                  Harga sekarang
                </button>
                <button type="button" className="pill !min-h-[34px] !px-4 !py-2 !text-xs" data-active={priceMode === "manual"} onClick={() => choosePriceMode("manual")}>
                  Manual
                </button>
                {priceMode === "live" && symbol.trim() && (
                  <button
                    type="button"
                    className="inline-flex size-8 items-center justify-center rounded-full border border-white/15 text-[var(--muted)] hover:text-[var(--text)]"
                    aria-label="Perbarui harga sekarang"
                    disabled={quoteState === "loading"}
                    onClick={() => fetchQuote(assetClass, symbol, true, memeTarget)}
                  >
                    <RefreshCw size={14} aria-hidden className={quoteState === "loading" ? "animate-spin" : ""} />
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]" role="status" aria-live="polite" data-testid="price-hint">
                {quoteState === "loading"
                  ? "Mengambil harga sekarang..."
                  : quoteState === "error"
                    ? "Harga sekarang belum tersedia untuk kode ini, isi manual saja."
                    : priceMode === "live" && liveQuote
                      ? `Harga dari ${SOURCE_LABEL[liveQuote.source] ?? liveQuote.source}, ${new Intl.DateTimeFormat("id-ID", { timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(liveQuote.t))} WIB. Pilih Manual untuk mengubahnya.`
                      : priceMode === "live"
                        ? "Pilih kode aset untuk mengambil harga sekarang."
                        : "Harga diisi manual."}
              </p>
            </div>
          )}
        </div>
      </div>

      {action === "open" && !closeTarget && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--line)] p-4">
          <div>
            <div className="text-sm">Tandai close</div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              Catat entry dan close sekaligus untuk posisi {direction === "short" ? "short" : "long"} yang sudah selesai. Hasilnya langsung masuk ke Kalender dan statistik.
              {closed && " Stop loss dan take profit dinonaktifkan."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={closed}
            aria-label="Tandai close"
            onClick={() => setClosed((v) => !v)}
            className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full border transition ${
              closed ? "border-teal-400/50 bg-teal-500/30" : "border-white/15 bg-white/5"
            }`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${closed ? "left-6" : "left-0.5"}`} />
          </button>
        </div>
      )}

      {closed && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="closePrice">
              Harga close ({quote})
            </label>
            <input
              id="closePrice"
              name="closePrice"
              required
              inputMode="decimal"
              autoComplete="off"
              className={field}
              value={closePrice}
              onChange={(e) => setClosePrice(e.target.value)}
            />
          </div>
          <div>
            <label className={label} htmlFor="closeWhen">
              Waktu close (WIB)
            </label>
            <input key={now} id="closeWhen" name="closeWhen" type="datetime-local" required className={field} defaultValue={now} />
          </div>
        </div>
      )}

      {assetClass === "meme" && (
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <div>
            <label className={label} htmlFor="chain">
              Chain
            </label>
            <select id="chain" name="chain" className={field} value={chain} onChange={(e) => setChain(e.target.value as Chain)} disabled={Boolean(closeTarget)}>
              {CHAINS.map((c) => (
                <option key={c} value={c}>
                  {CHAIN_LABEL[c]}
                </option>
              ))}
            </select>
            {closeTarget && <input type="hidden" name="chain" value={closeTarget.chain ?? "solana"} />}
          </div>
          <div>
            <label className={label} htmlFor="contract">
              Alamat kontrak token
            </label>
            <input
              id="contract"
              name="contract"
              required
              autoComplete="off"
              spellCheck={false}
              className={field}
              value={contract}
              onChange={(e) => setContract(e.target.value.trim())}
              readOnly={Boolean(closeTarget)}
              placeholder="Salin dari DexScreener atau explorer"
            />
          </div>
        </div>
      )}

      <div>
        <label className={label} htmlFor="when">
          {timeLabel}
        </label>
        <input key={now} id="when" name="when" type="datetime-local" required className={`${field} sm:max-w-xs`} defaultValue={now} />
      </div>

      {closing && (
        <div className="rounded-2xl border border-[var(--line)] p-4" data-testid="pnl-block">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm">Hasil (PnL)</span>
            <div className="flex gap-2">
              <button type="button" className="pill" data-active={pnlMode === "auto"} onClick={() => setPnlMode("auto")}>
                Otomatis
              </button>
              <button type="button" className="pill" data-active={pnlMode === "manual"} onClick={() => setPnlMode("manual")}>
                Manual
              </button>
            </div>
          </div>

          {pnlMode === "auto" ? (
            <div className="mt-3 text-sm" data-testid="pnl-preview">
              {preview ? (
                <>
                  <span className={`text-lg font-bold ${preview.pnl >= 0 ? "up" : "down"}`}>{minus(money(preview.pnl, ccy))}</span>
                  <span className={`ml-2 text-xs ${preview.pnl >= 0 ? "up" : "down"}`}>
                    {minus(`${preview.pct >= 0 ? "+" : ""}${preview.pct.toFixed(2).replace(".", ",")}%`)}
                  </span>
                  {preview.r !== null && (
                    <span className={`ml-3 text-xs ${preview.r >= 0 ? "up" : "down"}`} data-testid="r-preview">
                      {minus(`${preview.r >= 0 ? "+" : ""}${preview.r.toFixed(2).replace(".", ",")}R`)}
                    </span>
                  )}
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Sudah dikurangi fee{closed ? " entry dan close" : ""}. Fee yang kosong diperkirakan dari persentase bawaan.
                    {direction === "short" && " Short dihitung tanpa margin, bunga, atau funding. Pakai PnL manual bila perlu."}
                  </p>
                </>
              ) : (
                <p className="text-xs leading-relaxed text-[var(--muted)]">
                  {action === "close" && !closeTarget
                    ? "Dihitung otomatis saat disimpan, dari harga rata rata posisimu dikurangi fee."
                    : "Isi jumlah dan harga untuk melihat perkiraan hasil."}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <label className={label} htmlFor="pnlManual">
                PnL bersih ({quote})
              </label>
              <input
                id="pnlManual"
                name="pnlManual"
                required
                inputMode="text"
                autoComplete="off"
                className={`${field} sm:max-w-xs`}
                value={pnlManual}
                onChange={(e) => setPnlManual(e.target.value)}
                placeholder="Contoh 250000. Pakai minus di depan untuk rugi"
              />
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                Angka ini dianggap sudah bersih (fee, pajak, funding) dan menggantikan hitungan otomatis. Fee yang kamu isi hanya dicatat.
              </p>
            </div>
          )}

          <div className="mt-4 border-t border-white/5 pt-4">
            <label className={label} htmlFor="riskStop">
              Stop awal ({quote}), opsional
            </label>
            <input
              id="riskStop"
              name="riskStop"
              inputMode="decimal"
              autoComplete="off"
              className={`${field} sm:max-w-xs`}
              value={riskStop}
              onChange={(e) => setRiskStop(e.target.value)}
              placeholder={closeTarget?.stop ? plain(closeTarget.stop) : ""}
            />
            <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
              Hanya untuk menghitung R (hasil dibanding risiko awal), bukan order stop loss.
              {closeTarget?.stop ? " Kosongkan untuk memakai stop awal posisi ini." : ""}
              {direction === "short" ? " Untuk short, stop berada di atas harga entry." : " Untuk long, stop berada di bawah harga entry."}
            </p>
          </div>
        </div>
      )}

      <details className="rounded-2xl border border-[var(--line)] p-4 [&_summary]:cursor-pointer">
        <summary className="text-sm">Detail tambahan (fee, kurs, risiko, catatan)</summary>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className={label} htmlFor="fee">
              {closed ? "Fee entry" : "Fee"} ({quote}), kosongkan untuk perkiraan otomatis
            </label>
            <input id="fee" name="fee" inputMode="decimal" autoComplete="off" className={field} value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
          {closed && (
            <div>
              <label className={label} htmlFor="feeClose">
                Fee close ({quote}), kosongkan untuk perkiraan otomatis
              </label>
              <input
                id="feeClose"
                name="feeClose"
                inputMode="decimal"
                autoComplete="off"
                className={field}
                value={feeClose}
                onChange={(e) => setFeeClose(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className={label} htmlFor="usdIdr">
              Kurs USD ke IDR, kosongkan agar otomatis
            </label>
            <input id="usdIdr" name="usdIdr" inputMode="decimal" autoComplete="off" className={field} placeholder="16250" />
          </div>
          <div>
            <label className={label} htmlFor="stopLoss">
              Stop loss ({quote})
            </label>
            <input id="stopLoss" name="stopLoss" inputMode="decimal" autoComplete="off" className={field} disabled={closing} />
          </div>
          <div>
            <label className={label} htmlFor="takeProfit">
              Take profit ({quote})
            </label>
            <input id="takeProfit" name="takeProfit" inputMode="decimal" autoComplete="off" className={field} disabled={closing} />
          </div>
          {closing && (
            <p className="text-xs leading-relaxed text-[var(--muted)] sm:col-span-2 xl:col-span-4" data-testid="sltp-note">
              Stop loss dan take profit nonaktif karena {closed ? "posisi ditandai close" : "ini transaksi penutup posisi"}. Untuk menghitung R, isi Stop awal di blok Hasil.
            </p>
          )}
          <div>
            <label className={label} htmlFor="setup">
              Setup
            </label>
            <input id="setup" name="setup" maxLength={60} className={field} placeholder="Breakout, pullback, dll" />
          </div>
          <div>
            <label className={label} htmlFor="emotion">
              Emosi saat entry
            </label>
            <select id="emotion" name="emotion" className={field} defaultValue="">
              <option value="">Tidak diisi</option>
              {EMOTIONS.map((e) => (
                <option key={e} value={e}>
                  {e[0].toUpperCase() + e.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="tags">
              Tag, pisahkan dengan koma
            </label>
            <input id="tags" name="tags" className={field} placeholder="swing, dividen" />
          </div>
          <div className="sm:col-span-2 xl:col-span-4">
            <label className={label} htmlFor="notes">
              Catatan
            </label>
            <textarea id="notes" name="notes" rows={3} maxLength={1000} className={field} />
          </div>
        </div>
      </details>

      {state.message && (
        <div
          role="alert"
          className={`rounded-2xl border p-4 text-sm ${
            state.ok ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-red-400/30 bg-red-500/10 text-red-200"
          }`}
        >
          {state.message}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={pending || blocked}>
          {submitLabel}
        </button>
        {limit !== null && (
          <span className="text-xs text-[var(--muted)]">
            {used} dari {limit} transaksi terpakai. Menutup posisi tidak dibatasi.
            {blocked && (
              <>
                {" "}
                ·{" "}
                <Link href={deniedRedirect("premium", "/journal")} className="text-[var(--accent)] hover:underline">
                  Upgrade untuk tanpa batas
                </Link>
              </>
            )}
          </span>
        )}
      </div>
    </form>
  );
}
