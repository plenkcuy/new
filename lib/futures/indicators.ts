export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

const last = <T>(a: T[]): T => a[a.length - 1];
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  let running = 0;
  for (let i = 0; i < values.length; i++) {
    running += values[i];
    if (i >= period) running -= values[i - period];
    if (i >= period - 1) out.push(running / period);
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  let prev = sum(values.slice(0, period)) / period;
  const out = [prev];
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function rsi(values: number[], period = 14): number | null {
  if (values.length <= period) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (loss === 0) return gain === 0 ? 50 : 100;
  return 100 - 100 / (1 + gain / loss);
}

export function macdHistogram(values: number[]): number | null {
  const fast = ema(values, 12);
  const slow = ema(values, 26);
  if (!slow.length) return null;
  const offset = fast.length - slow.length;
  const line = slow.map((s, i) => fast[i + offset] - s);
  const signal = ema(line, 9);
  if (!signal.length) return null;
  return last(line) - last(signal);
}

export function adx(candles: Candle[], period = 14): number | null {
  if (candles.length < period * 2 + 1) return null;
  const tr: number[] = [];
  const plus: number[] = [];
  const minus: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];
    const up = cur.h - prev.h;
    const down = prev.l - cur.l;
    plus.push(up > down && up > 0 ? up : 0);
    minus.push(down > up && down > 0 ? down : 0);
    tr.push(Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c)));
  }
  let atr = sum(tr.slice(0, period));
  let p = sum(plus.slice(0, period));
  let m = sum(minus.slice(0, period));
  const dx: number[] = [];
  const pushDx = () => {
    const pdi = atr === 0 ? 0 : (100 * p) / atr;
    const mdi = atr === 0 ? 0 : (100 * m) / atr;
    const total = pdi + mdi;
    dx.push(total === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / total);
  };
  pushDx();
  for (let i = period; i < tr.length; i++) {
    atr = atr - atr / period + tr[i];
    p = p - p / period + plus[i];
    m = m - m / period + minus[i];
    pushDx();
  }
  if (dx.length < period) return null;
  let value = sum(dx.slice(0, period)) / period;
  for (let i = period; i < dx.length; i++) value = (value * (period - 1) + dx[i]) / period;
  return value;
}

export function stochastic(candles: Candle[], period = 5, smoothK = 3, smoothD = 3): { k: number; d: number } | null {
  if (candles.length < period) return null;
  const raw: number[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const win = candles.slice(i - period + 1, i + 1);
    const hh = Math.max(...win.map((c) => c.h));
    const ll = Math.min(...win.map((c) => c.l));
    raw.push(hh === ll ? 50 : ((candles[i].c - ll) / (hh - ll)) * 100);
  }
  const k = sma(raw, smoothK);
  const d = sma(k, smoothD);
  if (!d.length) return null;
  return { k: last(k), d: last(d) };
}

export function williamsR(candles: Candle[], period = 14): number | null {
  if (candles.length < period) return null;
  const win = candles.slice(-period);
  const hh = Math.max(...win.map((c) => c.h));
  const ll = Math.min(...win.map((c) => c.l));
  if (hh === ll) return -50;
  return ((hh - last(candles).c) / (hh - ll)) * -100;
}

export function obvRising(candles: Candle[], lookback = 10): boolean | null {
  if (candles.length <= lookback) return null;
  const obv: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const dir = Math.sign(candles[i].c - candles[i - 1].c);
    obv.push(obv[i - 1] + dir * candles[i].v);
  }
  return last(obv) > obv[obv.length - 1 - lookback];
}

export function cmf(candles: Candle[], period = 20): number | null {
  if (candles.length < period) return null;
  const win = candles.slice(-period);
  let flow = 0;
  let volume = 0;
  for (const c of win) {
    const range = c.h - c.l;
    const multiplier = range === 0 ? 0 : (c.c - c.l - (c.h - c.c)) / range;
    flow += multiplier * c.v;
    volume += c.v;
  }
  return volume === 0 ? 0 : flow / volume;
}

export function pointOfControl(candles: Candle[], bins = 24, lookback = 60): number | null {
  const win = candles.slice(-lookback);
  if (!win.length) return null;
  const lo = Math.min(...win.map((c) => c.l));
  const hi = Math.max(...win.map((c) => c.h));
  if (hi === lo) return hi;
  const step = (hi - lo) / bins;
  const volumes = new Array<number>(bins).fill(0);
  for (const c of win) {
    const typical = (c.h + c.l + c.c) / 3;
    const idx = Math.min(bins - 1, Math.floor((typical - lo) / step));
    volumes[idx] += c.v;
  }
  const best = volumes.indexOf(Math.max(...volumes));
  return lo + step * (best + 0.5);
}
