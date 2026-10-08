import { NextResponse } from "next/server";
import { FEATURE_MIN_TIER } from "@/lib/access";
import { authorizeApi } from "@/lib/auth";
import { loadTradeRows } from "@/lib/journal";
import { CLASS_LABEL } from "@/lib/shared";

// Sel yang diawali = + - @ bisa dibaca sebagai rumus oleh Excel, jadi diberi tanda petik di depan.
const cell = (value: string | number | null) => {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Ekspor seluruh transaksi jurnal ke CSV, khusus fitur "export-csv" (Premium ke atas). */
export async function GET() {
  const auth = await authorizeApi(FEATURE_MIN_TIER["export-csv"]);
  if (!auth.ok) return auth.response;

  const trades = await loadTradeRows(auth.session.user.id);
  const header = [
    "Waktu (UTC)",
    "Jenis aset",
    "Kode",
    "Sisi",
    "Jumlah",
    "Harga",
    "Mata uang",
    "Fee",
    "Kurs USD ke IDR",
    "Stop loss",
    "Take profit",
    "Setup",
    "Emosi",
    "Tag",
    "Catatan",
  ];
  const rows = trades.map((t) => [
    new Date(t.t).toISOString(),
    CLASS_LABEL[t.assetClass],
    t.symbol,
    t.side === "buy" ? "Beli" : "Jual",
    t.qty,
    t.price,
    t.ccy,
    t.fee,
    t.usdIdr,
    t.stopLoss,
    t.takeProfit,
    t.setup,
    t.emotion,
    t.tags.join(" "),
    t.notes,
  ]);
  const csv = [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");

  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="jurnal.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
