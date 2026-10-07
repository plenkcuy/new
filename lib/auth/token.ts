/**
 * Token sesi bertanda tangan HMAC-SHA256 memakai Web Crypto.
 * Tanpa dependensi dan berjalan di Edge (middleware) maupun Node.
 *
 * Format: base64url(payload JSON) + "." + base64url(tanda tangan)
 */
import { getAuthSecret } from "./config";
import { isTier } from "./tiers";
import type { SessionPayload } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(value: string) {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function importKey(secret: string, usage: KeyUsage[]) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, usage);
}

export async function signToken(payload: SessionPayload): Promise<string> {
  const secret = getAuthSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET belum diatur (minimal 32 karakter). Lihat README bagian Environment.");
  }
  const body = toB64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${toB64Url(new Uint8Array(signature))}`;
}

/** Mengembalikan payload jika tanda tangan valid dan belum kedaluwarsa, selain itu `null`. */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getAuthSecret();
    if (!secret) return null;

    const parts = token.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    const [body, signature] = parts;

    const key = await importKey(secret, ["verify"]);
    // `verify` membandingkan dengan waktu konstan.
    const valid = await crypto.subtle.verify("HMAC", key, fromB64Url(signature), encoder.encode(body));
    if (!valid) return null;

    const data: unknown = JSON.parse(decoder.decode(fromB64Url(body)));
    if (typeof data !== "object" || data === null) return null;
    const { sub, tier, exp } = data as Record<string, unknown>;
    if (typeof sub !== "string" || !isTier(tier) || typeof exp !== "number") return null;
    if (exp <= Math.floor(Date.now() / 1000)) return null;

    return { sub, tier, exp };
  } catch {
    return null;
  }
}
