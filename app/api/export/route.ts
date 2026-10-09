import { NextResponse } from "next/server";
import { FEATURE_MIN_TIER } from "@/lib/access";
import { authorizeApi } from "@/lib/auth";
import { getPortfolio } from "@/lib/journal";
import { convRate } from "@/lib/journal-calc";
import { CLASS_LABEL, type Ccy } from "@/lib/shared";

// Sel yang diawali = + - @ bisa dibaca sebagai rumus oleh Excel, jadi diberi tanda petik di depan.
const cell = (value: string | number) => {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Ekspor portofolio (dari jurnal) ke CSV, khusus fitur "export-csv" (Premium ke atas). */
export async function GET(request: Request) {
  const auth = await authorizeApi(FEATURE_MIN_TIER["export-csv"]);
  if (!auth.ok) return auth.response;

  const report: Ccy = new URL(request.url).searchParams.get("ccy") === "USD" ? "USD" : "IDR";
  const data = await getPortfolio({ userId: auth.session.user.id, report, rangeDays: 30, premium: false, maxAgeMs: 10_000 });

  const rows: (string | number)[][] = [
    ["Kode", "Jenis aset", "Jumlah", "Mata uang aset", "Harga rata rata", "Harga terkini", `Modal (${report})`, `Nilai (${report})`, `Untung rugi (${report})`, "Untung rugi (%)"],
    ...data.positions.map((p) => {
      const value = p.qty * p.price * convRate(p.ccy, report, data.usdIdr);
      const pnl = value - p.costReport;
      return [
        p.symbol,
        CLASS_LABEL[p.assetClass],
        p.qty,
        p.ccy,
        p.avgPrice,
        p.price,
        p.costReport,
        value,
        pnl,
        (p.costReport > 0 ? (pnl / p.costReport) * 100 : 0).toFixed(2),
      ];
    }),
  ];
  const csv = rows.map((row) => row.map(cell).join(",")).join("\r\n");

  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="portofolio.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
