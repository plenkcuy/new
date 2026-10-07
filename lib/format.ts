export const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export const compactIdr = (n: number) =>
  "Rp " +
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

export const num = (n: number) => new Intl.NumberFormat("id-ID").format(n);

export const decimal = (n: number, digits = 2) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

export const pct = (n: number, digits = 2) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(digits).replace(".", ",")}%`;

/** "2026-10-07" → "7 Okt 2026" (UTC agar sama di server dan client). */
export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );
