import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

/** Klien Neon (HTTP). Dibuat saat pertama dipakai, jadi build tidak butuh DATABASE_URL. */
export function db(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diatur. Lihat README bagian Environment.");
  client ??= neon(url);
  return client;
}
