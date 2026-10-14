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
  type Direction,
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
  /** Long dibuka dengan beli, short dibuka dengan jual. */
  direction: Direction;
  side: "buy" | "sell";
  qty: string;
  price: string;
  fee: string;
  usdIdr: string | null;
  tradedAt: number;
  /** Buka sekaligus tutup dalam satu input (long: beli lalu jual, short: jual lalu beli). Hanya berlaku pada transaksi pembuka. */
  closed: boolean;
  closePrice: string | null;
  closeAt: number | null;
  feeClose: string | null;
  /** Untung rugi bersih isian sendiri (bisa negatif), berlaku pada transaksi yang menutup posisi. */
  pnlManual: string | null;
  /** Stop awal khusus untuk menghitung R pada transaksi yang menutup posisi. Bukan order stop loss. */
  riskStop: string | null;
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

/** Perkiraan fee: jumlah x harga x persentase bawaan jenis aset. Dipakai server dan pratinjau di form. */
export function estimateFee(assetClass: AssetClass, side: "buy" | "sell", qty: number, price: number): number {
  return Number((qty * price * FEE_DEFAULTS[assetClass][side]).toFixed(12));
}

/** Angka boleh negatif (untuk PnL). Menerima tanda minus tipografis. */
function signedDecimal(raw: string): string | null {
  const clean = raw.replace(/[\u2212\u2013]/g, "-").replace(/\s/g, "").replace(",", ".");
  return /^-?\d{1,24}(\.\d{1,18})?$/.test(clean) ? clean : null;
}

/** Waktu WIB dari input datetime-local menjadi ms epoch. Pesan galat bila tidak valid. */
function parseTime(raw: string, label: string): { ok: true; ms: number } | { ok: false; message: string } {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return { ok: false, message: `Isi ${label}.` };
  const ms = new Date(`${raw}:00+07:00`).getTime();
  if (Number.isNaN(ms) || ms < Date.UTC(2000, 0, 1)) return { ok: false, message: `${label[0].toUpperCase()}${label.slice(1)} tidak valid.` };
  if (ms > Date.now() + 5 * 60 * 1000) return { ok: false, message: `${label[0].toUpperCase()}${label.slice(1)} tidak boleh di masa depan.` };
  return { ok: true, ms };
}

function normalizedFee(raw: string): string | null {
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  return /^\d{1,24}(\.\d{1,18})?$/.test(normalized) ? normalized : null;
}

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

  const direction: Direction = text(formData, "direction") === "short" ? "short" : "long";

  // Long dibuka dengan beli, short dibuka dengan jual. Sisi lainnya sudah berarti menutup posisi.
  const opening = (direction === "long") === (side === "buy");
  const closeSide = side === "buy" ? "sell" : "buy";

  // Tandai close hanya untuk transaksi pembuka.
  const closed = opening && text(formData, "closed") === "on";
  const closing = closed || !opening;

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
  if (rawFee === "") fee = String(estimateFee(assetClass, side, Number(qty), Number(price)));
  else {
    const normalized = normalizedFee(rawFee);
    if (normalized === null) return fail(closed ? "Fee entry harus berupa angka nol atau lebih." : "Fee harus berupa angka nol atau lebih.");
    fee = normalized;
  }

  const rawFx = text(formData, "usdIdr");
  let usdIdr: string | null = null;
  if (rawFx !== "") {
    usdIdr = decimal(rawFx);
    if (!usdIdr || Number(usdIdr) < 1000 || Number(usdIdr) > 100_000) return fail("Kurs USD ke IDR tidak masuk akal.");
  }

  const entryTime = parseTime(text(formData, "when"), closed ? "waktu entry" : "waktu transaksi");
  if (!entryTime.ok) return fail(entryTime.message);
  const tradedAt = entryTime.ms;

  let closePrice: string | null = null;
  let closeAt: number | null = null;
  let feeClose: string | null = null;
  if (closed) {
    closePrice = decimal(text(formData, "closePrice"));
    if (!closePrice) return fail("Harga close harus berupa angka lebih dari nol.");

    const closeTime = parseTime(text(formData, "closeWhen"), "waktu close");
    if (!closeTime.ok) return fail(closeTime.message);
    if (closeTime.ms < tradedAt) return fail("Waktu close tidak boleh sebelum waktu entry.");
    closeAt = closeTime.ms;

    const rawFeeClose = text(formData, "feeClose");
    if (rawFeeClose === "") feeClose = String(estimateFee(assetClass, closeSide, Number(qty), Number(closePrice)));
    else {
      feeClose = normalizedFee(rawFeeClose);
      if (feeClose === null) return fail("Fee close harus berupa angka nol atau lebih.");
    }
  }

  // PnL manual hanya berarti pada transaksi yang menutup posisi.
  let pnlManual: string | null = null;
  if (closing && text(formData, "pnlMode") === "manual") {
    pnlManual = signedDecimal(text(formData, "pnlManual"));
    if (pnlManual === null) return fail("PnL manual harus berupa angka. Pakai tanda minus di depan untuk rugi.");
  }

  // Stop awal hanya untuk menghitung R. Pada close langsung posisinya harus masuk akal terhadap harga entry.
  let riskStop: string | null = null;
  if (closing) {
    const rawRisk = text(formData, "riskStop");
    if (rawRisk !== "") {
      riskStop = decimal(rawRisk);
      if (!riskStop) return fail("Stop awal harus berupa angka lebih dari nol.");
      if (closed) {
        const wrong = direction === "long" ? Number(riskStop) >= Number(price) : Number(riskStop) <= Number(price);
        if (wrong) return fail(direction === "long" ? "Stop awal Long harus di bawah harga entry." : "Stop awal Short harus di atas harga entry.");
      }
    }
  }

  const optionalPrice = (key: string): string | null | undefined => {
    const raw = text(formData, key);
    if (raw === "") return null;
    const parsed = decimal(raw);
    return parsed ?? undefined;
  };
  // Stop loss dan take profit nonaktif saat posisi ditandai close atau transaksinya jual: nilainya diabaikan.
  const stopLoss = closing ? null : optionalPrice("stopLoss");
  if (stopLoss === undefined) return fail("Stop loss harus berupa angka lebih dari nol.");
  const takeProfit = closing ? null : optionalPrice("takeProfit");
  if (takeProfit === undefined) return fail("Take profit harus berupa angka lebih dari nol.");

  // Long: stop di bawah entry dan target di atas. Short kebalikannya.
  const entry = Number(price);
  if (stopLoss && (direction === "long" ? Number(stopLoss) >= entry : Number(stopLoss) <= entry)) {
    return fail(direction === "long" ? "Stop loss Long harus di bawah harga entry." : "Stop loss Short harus di atas harga entry.");
  }
  if (takeProfit && (direction === "long" ? Number(takeProfit) <= entry : Number(takeProfit) >= entry)) {
    return fail(direction === "long" ? "Take profit Long harus di atas harga entry." : "Take profit Short harus di bawah harga entry.");
  }

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
      direction,
      side,
      qty,
      price,
      fee,
      usdIdr,
      tradedAt,
      closed,
      closePrice,
      closeAt,
      feeClose,
      pnlManual,
      riskStop,
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

export type PnlPreview = { pnl: number; pct: number; r: number | null };

/**
 * Pratinjau untung rugi bersih (mata uang aset) untuk form, memakai rumus yang sama dengan mesin hitung.
 * `avgPrice` diisi saat menutup posisi yang sudah ada (long: sudah termasuk fee beli, short: sudah setelah fee jual).
 * Fee yang kosong diperkirakan dari persentase bawaan. null bila datanya belum lengkap.
 */
export function previewPnl(input: {
  assetClass: AssetClass;
  direction?: Direction;
  kind: "roundtrip" | "close";
  qty: number;
  entry?: number;
  close: number;
  avgPrice?: number;
  feeEntry?: number | null;
  feeClose?: number | null;
  /** Stop awal untuk menghitung R. */
  stop?: number | null;
}): PnlPreview | null {
  const { assetClass, qty, close } = input;
  const direction = input.direction ?? "long";
  const sign = direction === "long" ? 1 : -1;
  if (!(qty > 0) || !(close > 0)) return null;

  const openSide = direction === "long" ? "buy" : "sell";
  const closeSide = direction === "long" ? "sell" : "buy";

  const feeOut = input.feeClose ?? estimateFee(assetClass, closeSide, qty, close);
  const closeValue = qty * close - sign * feeOut;

  let openValue: number;
  if (input.kind === "roundtrip") {
    if (!input.entry || !(input.entry > 0)) return null;
    openValue = qty * input.entry + sign * (input.feeEntry ?? estimateFee(assetClass, openSide, qty, input.entry));
  } else {
    if (!input.avgPrice || !(input.avgPrice > 0)) return null;
    openValue = qty * input.avgPrice;
  }

  const pnl = sign * (closeValue - openValue);
  const avg = openValue / qty;
  const stop = input.stop;
  const stopOk = stop !== null && stop !== undefined && stop > 0 && (direction === "long" ? stop < avg : stop > avg);
  return { pnl, pct: (pnl / openValue) * 100, r: stopOk ? pnl / (Math.abs(avg - (stop as number)) * qty) : null };
}
