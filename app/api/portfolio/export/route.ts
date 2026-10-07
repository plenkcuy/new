import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/guards";
import { getHoldings } from "@/lib/data/market";
import { FEATURE_MIN_TIER } from "@/lib/plans";

const cell = (value: string | number) => {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Ekspor portofolio ke CSV, khusus fitur "export-csv" (Premium ke atas). */
export async function GET() {
  const auth = await authorizeApi(FEATURE_MIN_TIER["export-csv"]);
  if (!auth.ok) return auth.response;

  const holdings = await getHoldings();
  const rows: (string | number)[][] = [
    ["Kode", "Nama", "Sektor", "Lembar", "Harga rata-rata", "Harga", "Nilai", "Untung/rugi (%)"],
    ...holdings.map((h) => [
      h.symbol,
      h.name,
      h.sector,
      h.units,
      h.avgPrice,
      h.price,
      h.units * h.price,
      ((h.price / h.avgPrice - 1) * 100).toFixed(2),
    ]),
  ];
  const csv = rows.map((row) => row.map(cell).join(",")).join("\r\n");

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="portofolio.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
