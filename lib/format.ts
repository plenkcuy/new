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

export const pct = (n: number, digits = 2) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(digits).replace(".", ",")}%`;
