/**
 * Membaca dan memvalidasi form transaksi. Semua input dianggap tidak tepercaya.
 * Angka dikembalikan sebagai string supaya presisi numeric Postgres tidak hilang.
 */
import {
  CHAINS,
  EMOTIONS,
  IDX_LOT,
  isAssetClass,
  type AssetClass,
  type Chain,
} from "./shared";

/** Perkiraan fee per kelas aset. Dipakai bila kolom fee dikosongkan. Sesuaikan dengan brokermu. */
export const FEE_DEFAULTS: Record<AssetClass, { buy: number; sell: number }> = {
  idx: { buy: 0.0015, sell: 0.0025 },
  us_stock: { buy: 0.001, sell: 0.001 },
  crypto: { buy: 0.001, sell: 0.001 },
  meme: { buy: 0.003, sell: 0.003 },
};

export type TradeFormValue = {
  assetClass: AssetClass;
  symbol: string;
  chain: Chain | null;
  contract: string | null;
  side: "buy" | "sell";
  qty: string;
  price: string;
  fee: string;
  usdIdr: string | null;
  tradedAt: number;
  stopLoss: string | null;
  takeProfit: string | null;
  setup: string | null;
  emotion: string | null;
  notes: string | null;
  tags: string[];
};

type Parsed = { ok: true; value: TradeFormValue } | { ok: false; message: string };

const SYMBOL_RULES: Record<AssetClass, RegExp> = {
  idx: /^[A-Z0-9]{2,6}$/,
  us_stock: /^[A-Z.]{1,6}$/,
  crypto: /^[A-Z0-9]{2,12}$/,
  meme: /^[A-Za-z0-9$_.]{1,20}$/,
};

const DECIMAL = /^\d{1,24}(\.\d{1,18})?$/;
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

function decimal(raw: string): string | null {
  const clean = raw.replace(/\s/g, "").replace(",", ".");
  if (!DECIMAL.test(clean)) return null;
  return Number(clean) > 0 ? clean : null;
}

export function parseTradeForm(formData: FormData): Parsed {
  const fail = (message: string): Parsed => ({ ok: false, message });

  const assetClass = text(formData, "assetClass");
  if (!isAssetClass(assetClass)) return fail("Pilih jenis aset.");

  const rawSymbol = text(formData, "symbol");
  const symbol = assetClass === "meme" ? rawSymbol : rawSymbol.toUpperCase();
  if (!SYMBOL_RULES[assetClass].test(symbol)) return fail("Kode aset tidak valid.");

  let chain: Chain | null = null;
  let contract: string | null = null;
  if (assetClass === "meme") {
    const rawChain = text(formData, "chain");
    chain = (CHAINS as readonly string[]).includes(rawChain) ? (rawChain as Chain) : null;
    if (!chain) return fail("Pilih chain untuk meme coin.");
    const address = text(formData, "contract");
    const valid = chain === "solana" ? SOLANA_ADDRESS.test(address) : EVM_ADDRESS.test(address);
    if (!valid) return fail("Alamat kontrak tidak valid untuk chain yang dipilih.");
    contract = chain === "solana" ? address : address.toLowerCase();
  }

  const side = text(formData, "side");
  if (side !== "buy" && side !== "sell") return fail("Pilih beli atau jual.");

  let qty = decimal(text(formData, "qty"));
  if (!qty) return fail("Jumlah harus berupa angka lebih dari nol.");
  if (assetClass === "idx") {
    const unit = text(formData, "unit");
    if (!/^\d{1,9}$/.test(qty)) return fail("Saham IDX hanya menerima bilangan bulat.");
    if (unit !== "share") qty = String(Number(qty) * IDX_LOT);
  }

  const price = decimal(text(formData, "price"));
  if (!price) return fail("Harga harus berupa angka lebih dari nol.");

  const rawFee = text(formData, "fee");
  let fee: string;
  if (rawFee === "") {
    const pct = FEE_DEFAULTS[assetClass][side];
    fee = String(Number((Number(qty) * Number(price) * pct).toFixed(12)));
  } else {
    const normalized = rawFee.replace(/\s/g, "").replace(",", ".");
    if (!/^\d{1,24}(\.\d{1,18})?$/.test(normalized)) return fail("Fee harus berupa angka nol atau lebih.");
    fee = normalized;
  }

  const rawFx = text(formData, "usdIdr");
  let usdIdr: string | null = null;
  if (rawFx !== "") {
    usdIdr = decimal(rawFx);
    if (!usdIdr || Number(usdIdr) < 1000 || Number(usdIdr) > 100_000) return fail("Kurs USD ke IDR tidak masuk akal.");
  }

  const rawTime = text(formData, "when");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawTime)) return fail("Isi waktu transaksi.");
  const tradedAt = new Date(`${rawTime}:00+07:00`).getTime();
  if (Number.isNaN(tradedAt) || tradedAt < Date.UTC(2000, 0, 1)) return fail("Waktu transaksi tidak valid.");
  if (tradedAt > Date.now() + 5 * 60 * 1000) return fail("Waktu transaksi tidak boleh di masa depan.");

  const optionalPrice = (key: string): string | null | undefined => {
    const raw = text(formData, key);
    if (raw === "") return null;
    const parsed = decimal(raw);
    return parsed ?? undefined;
  };
  const stopLoss = optionalPrice("stopLoss");
  if (stopLoss === undefined) return fail("Stop loss harus berupa angka lebih dari nol.");
  const takeProfit = optionalPrice("takeProfit");
  if (takeProfit === undefined) return fail("Take profit harus berupa angka lebih dari nol.");

  const setup = text(formData, "setup").slice(0, 60) || null;

  const rawEmotion = text(formData, "emotion");
  const emotion = (EMOTIONS as readonly string[]).includes(rawEmotion) ? rawEmotion : null;

  const notes = text(formData, "notes").slice(0, 1000) || null;

  const tags = text(formData, "tags")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  if (tags.length > 8) return fail("Maksimal 8 tag.");
  if (tags.some((tag) => !/^[a-z0-9 _]{1,24}$/.test(tag))) return fail("Tag hanya boleh huruf, angka, dan spasi.");

  return {
    ok: true,
    value: {
      assetClass,
      symbol,
      chain,
      contract,
      side,
      qty,
      price,
      fee,
      usdIdr,
      tradedAt,
      stopLoss,
      takeProfit,
      setup,
      emotion,
      notes,
      tags: [...new Set(tags)],
    },
  };
}

/** Mengubah tanggal jam WIB (ms epoch) menjadi nilai untuk input datetime-local. */
export const toWibInput = (ms: number) => new Date(ms + WIB_OFFSET_MS).toISOString().slice(0, 16);
