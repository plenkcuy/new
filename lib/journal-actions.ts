"use server";

// Setiap fungsi di file ini menjadi endpoint publik, jadi masing masing wajib memeriksa sesi sendiri.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { limitsFor } from "./access";
import { requireSession } from "./auth";
import { insertTrade, removeTrade } from "./journal";
import { parseTradeForm } from "./journal-input";
import { refreshAssetPrices } from "./market-feed";
import { refreshAssetIcon } from "./quotes";
import type { JournalFormState } from "./shared";

const ECHO_KEYS = ["symbol", "qty", "price", "fee", "usdIdr", "when", "stopLoss", "takeProfit", "setup", "notes", "tags", "contract", "emotion"];

export async function addTrade(_: JournalFormState, formData: FormData): Promise<JournalFormState> {
  const { user } = await requireSession();

  const echo: Record<string, string> = {};
  for (const key of ECHO_KEYS) echo[key] = String(formData.get(key) ?? "").slice(0, 1000);

  const parsed = parseTradeForm(formData);
  if (!parsed.ok) return { ok: false, message: parsed.message, values: echo };

  let result;
  try {
    result = await insertTrade(user.id, limitsFor(user.tier).journalTrades, parsed.value);
  } catch {
    return { ok: false, message: "Transaksi gagal disimpan. Coba lagi sebentar lagi.", values: echo };
  }
  if (!result.ok) return { ok: false, message: result.message, values: echo };

  // Harga historis diambil setelah respons terkirim supaya form tidak menunggu sumber data luar.
  const { asset } = result;
  const from = parsed.value.tradedAt;
  const { assetClass, symbol, chain } = parsed.value;
  after(async () => {
    try {
      await refreshAssetPrices(asset, from);
    } catch {
      // Jurnal tetap memakai harga transaksi bila sumber data gagal.
    }
    try {
      await refreshAssetIcon({ assetId: asset.id, assetClass, symbol, chain, priceRef: asset.priceRef });
    } catch {
      // Tanpa ikon, tampilan memakai huruf kode aset.
    }
  });

  revalidatePath("/journal");
  return { ok: true, message: "Transaksi tersimpan." };
}

export async function deleteTrade(formData: FormData): Promise<void> {
  const { user } = await requireSession();

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) redirect("/journal?error=invalid");

  const result = await removeTrade(user.id, id);
  if (!result.ok) redirect(`/journal?error=${result.code}`);

  revalidatePath("/journal");
  redirect("/journal");
}
