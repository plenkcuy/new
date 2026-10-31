const PREFIX = "lumen:futures:v1:";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_STORE_CHARS = 300_000;

type Entry = { at: number; value: unknown };

const memory = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readEntry<T>(key: string, validate: (v: unknown) => v is T): { at: number; value: T } | null {
  const now = Date.now();
  const fromMemory = memory.get(key);
  if (fromMemory && validate(fromMemory.value)) return { at: fromMemory.at, value: fromMemory.value };

  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(PREFIX + key);
    if (raw === null || raw.length > MAX_STORE_CHARS) return null;
    const parsed = JSON.parse(raw) as Partial<Entry> | null;
    const fresh =
      parsed && typeof parsed.at === "number" && parsed.at <= now + 60_000 && now - parsed.at <= MAX_AGE_MS;
    if (!fresh || !validate(parsed.value)) {
      store.removeItem(PREFIX + key);
      return null;
    }
    memory.set(key, { at: parsed.at as number, value: parsed.value });
    return { at: parsed.at as number, value: parsed.value };
  } catch {
    return null;
  }
}

function writeEntry(key: string, value: unknown): void {
  const entry: Entry = { at: Date.now(), value };
  memory.set(key, entry);
  const store = storage();
  if (!store) return;
  try {
    const raw = JSON.stringify(entry);
    if (raw.length <= MAX_STORE_CHARS) store.setItem(PREFIX + key, raw);
  } catch {
    return;
  }
}

export async function cached<T>(
  key: string,
  ttlMs: number | ((value: T) => number),
  loader: () => Promise<T>,
  validate: (v: unknown) => v is T,
): Promise<T> {
  const entry = readEntry(key, validate);
  if (entry) {
    const ttl = typeof ttlMs === "function" ? ttlMs(entry.value) : ttlMs;
    if (Date.now() - entry.at < ttl) return entry.value;
  }

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const run = (async () => {
    try {
      const value = await loader();
      if (!validate(value)) throw new Error("data tidak valid");
      writeEntry(key, value);
      return value;
    } catch (error) {
      if (entry) return entry.value;
      throw error;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, run);
  return run;
}

export function clearCache(): void {
  memory.clear();
  inflight.clear();
  const store = storage();
  if (!store) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key && key.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => store.removeItem(key));
  } catch {
    return;
  }
}
