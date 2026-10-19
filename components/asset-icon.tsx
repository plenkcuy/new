"use client";

import { useEffect, useRef, useState } from "react";
import { SymbolDot } from "./ui";

/** Ikon aset dari sumber data. Bila kosong atau gagal dimuat, kembali ke huruf kode aset. */
export function AssetIcon({
  symbol,
  color,
  icon,
  size = 32,
}: {
  symbol: string;
  color: string;
  icon: string | null | undefined;
  size?: number;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const image = useRef<HTMLImageElement>(null);

  // Gambar yang gagal dimuat sebelum halaman aktif tidak memicu onError, jadi diperiksa lagi saat mount.
  useEffect(() => {
    const el = image.current;
    if (icon && el && el.complete && el.naturalWidth === 0) setFailed(icon);
  }, [icon]);

  if (!icon || failed === icon) return <SymbolDot symbol={symbol} color={color} size={size} />;

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white"
      style={{ width: size, height: size }}
    >
      <img
        ref={image}
        src={icon}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(icon)}
        className="h-full w-full object-contain p-[3px]"
      />
    </span>
  );
}
