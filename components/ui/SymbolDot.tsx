/** Lingkaran berwarna dengan huruf pertama kode saham (pengganti logo emiten). */
export function SymbolDot({ symbol, color, size = 36 }: { symbol: string; color: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ background: color, width: size, height: size }}
      aria-hidden
    >
      {symbol[0]}
    </div>
  );
}
