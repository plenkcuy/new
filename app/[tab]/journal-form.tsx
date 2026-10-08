"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { addTrade } from "@/lib/journal-actions";
import { deniedRedirect } from "@/lib/access";
import { toWibInput } from "@/lib/journal-input";
import {
  ASSET_CLASSES,
  CHAINS,
  CHAIN_LABEL,
  CLASS_LABEL,
  EMOTIONS,
  type AssetClass,
  type JournalFormState,
} from "@/lib/shared";

const field =
  "w-full rounded-2xl border border-[var(--line)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-white/30";
const label = "mb-1.5 block text-xs text-[var(--muted)]";

const INITIAL: JournalFormState = { ok: false };

export function TradeForm({ used, limit }: { used: number; limit: number | null }) {
  const [state, action, pending] = useActionState(addTrade, INITIAL);
  const [assetClass, setAssetClass] = useState<AssetClass>("idx");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [now, setNow] = useState("");

  useEffect(() => setNow(toWibInput(Date.now())), []);

  const v = state.values ?? {};
  const full = limit !== null && used >= limit;
  const quote = assetClass === "idx" ? "Rp" : "USD";

  return (
    <form action={action} className="flex flex-col gap-5 [color-scheme:dark]">
      <input type="hidden" name="assetClass" value={assetClass} />
      <input type="hidden" name="side" value={side} />

      <div className="flex flex-wrap gap-2">
        {ASSET_CLASSES.map((c) => (
          <button key={c} type="button" className="pill" data-active={assetClass === c} onClick={() => setAssetClass(c)}>
            {CLASS_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            defaultValue={v.symbol}
            placeholder={
              assetClass === "idx" ? "BBCA" : assetClass === "us_stock" ? "AAPL" : assetClass === "crypto" ? "BTC" : "BONK"
            }
          />
        </div>

        <div>
          <span className={label}>Sisi</span>
          <div className="flex gap-2">
            <button type="button" className="pill flex-1" data-active={side === "buy"} onClick={() => setSide("buy")}>
              Beli
            </button>
            <button type="button" className="pill flex-1" data-active={side === "sell"} onClick={() => setSide("sell")}>
              Jual
            </button>
          </div>
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
              defaultValue={v.qty}
              placeholder={assetClass === "idx" ? "10" : "0,5"}
            />
            {assetClass === "idx" && (
              <select name="unit" className={`${field} w-28`} defaultValue="lot" aria-label="Satuan jumlah">
                <option value="lot">lot</option>
                <option value="share">lembar</option>
              </select>
            )}
          </div>
        </div>

        <div>
          <label className={label} htmlFor="price">
            Harga ({quote})
          </label>
          <input
            id="price"
            name="price"
            required
            inputMode="decimal"
            autoComplete="off"
            className={field}
            defaultValue={v.price}
            placeholder={assetClass === "idx" ? "9850" : "0,00001234"}
          />
        </div>
      </div>

      {assetClass === "meme" && (
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <div>
            <label className={label} htmlFor="chain">
              Chain
            </label>
            <select id="chain" name="chain" className={field} defaultValue="solana">
              {CHAINS.map((c) => (
                <option key={c} value={c}>
                  {CHAIN_LABEL[c]}
                </option>
              ))}
            </select>
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
              defaultValue={v.contract}
              placeholder="Salin dari DexScreener atau explorer"
            />
          </div>
        </div>
      )}

      <div>
        <label className={label} htmlFor="when">
          Waktu transaksi (WIB)
        </label>
        <input
          key={now}
          id="when"
          name="when"
          type="datetime-local"
          required
          className={`${field} sm:max-w-xs`}
          defaultValue={v.when ?? now}
        />
      </div>

      <details className="rounded-2xl border border-[var(--line)] p-4 [&_summary]:cursor-pointer">
        <summary className="text-sm">Detail tambahan (fee, kurs, risiko, catatan)</summary>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className={label} htmlFor="fee">
              Fee ({quote}), kosongkan untuk perkiraan otomatis
            </label>
            <input id="fee" name="fee" inputMode="decimal" autoComplete="off" className={field} defaultValue={v.fee} />
          </div>
          <div>
            <label className={label} htmlFor="usdIdr">
              Kurs USD ke IDR, kosongkan agar otomatis
            </label>
            <input
              id="usdIdr"
              name="usdIdr"
              inputMode="decimal"
              autoComplete="off"
              className={field}
              defaultValue={v.usdIdr}
              placeholder="16250"
            />
          </div>
          <div>
            <label className={label} htmlFor="stopLoss">
              Stop loss ({quote})
            </label>
            <input id="stopLoss" name="stopLoss" inputMode="decimal" autoComplete="off" className={field} defaultValue={v.stopLoss} />
          </div>
          <div>
            <label className={label} htmlFor="takeProfit">
              Take profit ({quote})
            </label>
            <input
              id="takeProfit"
              name="takeProfit"
              inputMode="decimal"
              autoComplete="off"
              className={field}
              defaultValue={v.takeProfit}
            />
          </div>
          <div>
            <label className={label} htmlFor="setup">
              Setup
            </label>
            <input id="setup" name="setup" maxLength={60} className={field} defaultValue={v.setup} placeholder="Breakout, pullback, dll" />
          </div>
          <div>
            <label className={label} htmlFor="emotion">
              Emosi saat entry
            </label>
            <select id="emotion" name="emotion" className={field} defaultValue={v.emotion ?? ""}>
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
            <input id="tags" name="tags" className={field} defaultValue={v.tags} placeholder="swing, dividen" />
          </div>
          <div className="sm:col-span-2 xl:col-span-4">
            <label className={label} htmlFor="notes">
              Catatan
            </label>
            <textarea id="notes" name="notes" rows={3} maxLength={1000} className={field} defaultValue={v.notes} />
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
        <button type="submit" className="btn btn-primary" disabled={pending || full}>
          {pending ? "Menyimpan" : "Simpan transaksi"}
        </button>
        {limit !== null && (
          <span className="text-xs text-[var(--muted)]">
            {used} dari {limit} transaksi terpakai
            {full && (
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
