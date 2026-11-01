import { clamp, mean, median, quantile, sampleStdev, studentTwoSidedP } from "./stats";

/** Transaksi pembukaan posisi (beli untuk long, jual untuk short). */
export type EntryEvent = { t: number; value: number };
/** Posisi yang ditutup, hasilnya dalam rupiah dan persen. */
export type ClosedEvent = { t: number; pnl: number; pnlPct: number };

export type Level = "rendah" | "sedang" | "tinggi";

export type OvertradingResult =
  | { status: "insufficient"; message: string }
  | { status: "ok"; score: number; level: Level; signals: string[] };

export type LuckResult =
  | { status: "insufficient"; closed: number; need: number }
  | { status: "unprofitable" }
  | { status: "ok"; score: number; level: Level; facts: string[]; summary: string; smallSample: boolean };

export const MIN_ENTRIES = 20;
export const MIN_BASELINE_DAYS = 8;
export const MIN_CLOSED = 20;

const WIB_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const BURST_GAP_MS = 15 * 60 * 1000;
const REVENGE_WINDOW_MS = 30 * 60 * 1000;
const RECENT_DAYS = 7;
const BASELINE_DAYS = 90;
const REVENGE_LOOKBACK_DAYS = 30;

const dayIndex = (ms: number) => Math.floor((ms + WIB_MS) / DAY_MS);
const level = (score: number): Level => (score < 30 ? "rendah" : score < 60 ? "sedang" : "tinggi");
const fmt = (n: number, digits = 1) => n.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function burstShare(times: number[]): number | null {
  if (times.length < 2) return null;
  let bursts = 0;
  for (let i = 1; i < times.length; i++) if (times[i] - times[i - 1] <= BURST_GAP_MS) bursts++;
  return bursts / times.length;
}

/**
 * Risiko overtrading dibandingkan dengan kebiasaanmu sendiri, bukan angka tetap, karena tidak ada batas
 * jumlah transaksi yang berlaku untuk semua orang. Empat sinyal: frekuensi, transaksi beruntun, transaksi
 * balas dendam setelah rugi, dan hasil yang memburuk di hari ramai.
 */
export function analyzeOvertrading(entries: EntryEvent[], closed: ClosedEvent[], now: number): OvertradingResult {
  const sorted = [...entries].sort((a, b) => a.t - b.t);
  const today = dayIndex(now);
  const recentStart = today - (RECENT_DAYS - 1);
  const baselineStart = recentStart - BASELINE_DAYS;

  const counts = new Map<number, number>();
  for (const e of sorted) counts.set(dayIndex(e.t), (counts.get(dayIndex(e.t)) ?? 0) + 1);

  const baseline: number[] = [];
  const recent: number[] = [];
  for (const [day, n] of counts) {
    if (day >= recentStart && day <= today) recent.push(n);
    else if (day >= baselineStart && day < recentStart) baseline.push(n);
  }

  if (sorted.length < MIN_ENTRIES || baseline.length < MIN_BASELINE_DAYS) {
    return {
      status: "insufficient",
      message: `Butuh minimal ${MIN_ENTRIES} transaksi dan ${MIN_BASELINE_DAYS} hari aktif sebelum minggu ini. Sekarang ada ${sorted.length} transaksi dan ${baseline.length} hari aktif.`,
    };
  }
  if (!recent.length) {
    return { status: "ok", score: 0, level: "rendah", signals: ["Belum ada transaksi dalam 7 hari terakhir."] };
  }

  const med = median(baseline);
  const mad = median(baseline.map((x) => Math.abs(x - med)));
  const scale = Math.max(1.4826 * mad, 0.5 * med, 0.5);
  const recentRate = mean(recent);
  const ratio = recentRate / med;
  const z = (recentRate - med) / scale;
  const frequency = z >= 1.5 ? clamp(ratio - 1, 0, 1) : 0;
  const peak = Math.max(...recent);
  const usual = quantile(baseline, 0.9);

  const recentTimes = sorted.filter((e) => dayIndex(e.t) >= recentStart).map((e) => e.t);
  const baselineTimes = sorted.filter((e) => dayIndex(e.t) >= baselineStart && dayIndex(e.t) < recentStart).map((e) => e.t);
  const recentBurst = recentTimes.length >= 4 ? burstShare(recentTimes) : null;
  const baselineBurst = baselineTimes.length >= 10 ? burstShare(baselineTimes) : null;
  const burst = recentBurst !== null && baselineBurst !== null ? clamp((recentBurst - baselineBurst) / 0.3, 0, 1) : 0;

  const since = now - REVENGE_LOOKBACK_DAYS * DAY_MS;
  const losses = closed.filter((c) => c.pnl < 0 && c.t >= since);
  let revengeEvents = 0;
  if (losses.length >= 3) {
    for (const loss of losses) {
      if (sorted.some((e) => e.t > loss.t && e.t <= loss.t + REVENGE_WINDOW_MS)) revengeEvents++;
    }
  }
  const revenge = losses.length >= 3 ? clamp(revengeEvents / losses.length / 0.5, 0, 1) : 0;

  const busyThreshold = Math.max(med * 1.5, med + 1);
  const busy: number[] = [];
  const normal: number[] = [];
  for (const c of closed) {
    const day = dayIndex(c.t);
    if (day < baselineStart) continue;
    (( counts.get(day) ?? 0) >= busyThreshold ? busy : normal).push(c.pnlPct);
  }
  let performance = 0;
  const busyAvg = mean(busy);
  const normalAvg = mean(normal);
  if (busy.length >= 5 && normal.length >= 5 && busyAvg < normalAvg) {
    performance = clamp((normalAvg - busyAvg) / Math.max(1, Math.abs(normalAvg), Math.abs(busyAvg)), 0, 1);
  }

  const score = Math.round(100 * (0.4 * frequency + 0.2 * burst + 0.25 * revenge + 0.15 * performance));

  const signals: Array<{ weight: number; text: string }> = [];
  if (frequency > 0) {
    signals.push({
      weight: 0.4 * frequency,
      text: `Minggu ini rata rata ${fmt(recentRate)} transaksi per hari aktif, biasanya ${fmt(med)}.${peak > usual ? ` Hari tersibuk ${peak} transaksi.` : ""}`,
    });
  }
  if (burst > 0 && recentBurst !== null && baselineBurst !== null) {
    signals.push({
      weight: 0.2 * burst,
      text: `${Math.round(recentBurst * 100)}% transaksi dibuka kurang dari 15 menit setelah transaksi sebelumnya, biasanya ${Math.round(baselineBurst * 100)}%.`,
    });
  }
  if (revenge > 0) {
    signals.push({
      weight: 0.25 * revenge,
      text: `${revengeEvents} dari ${losses.length} kerugian bulan ini langsung disusul transaksi baru dalam 30 menit.`,
    });
  }
  if (performance > 0) {
    signals.push({
      weight: 0.15 * performance,
      text: `Di hari ramai, rata rata hasil per transaksi ${fmt(busyAvg)}%, dibanding ${fmt(normalAvg)}% di hari biasa.`,
    });
  }
  signals.sort((a, b) => b.weight - a.weight);

  return {
    status: "ok",
    score,
    level: level(score),
    signals: signals.length ? signals.slice(0, 3).map((s) => s.text) : ["Pola transaksimu masih sejalan dengan kebiasaanmu."],
  };
}

/**
 * Indikasi hoki: apakah untung yang terlihat bisa dibedakan dari kebetulan. Memakai uji t pada hasil per transaksi,
 * ketergantungan pada satu dua transaksi besar, dan panjang rentetan menang dibanding perkiraan acak.
 */
export function analyzeLuck(closed: ClosedEvent[]): LuckResult {
  const trades = [...closed].sort((a, b) => a.t - b.t);
  const n = trades.length;
  if (n < MIN_CLOSED) return { status: "insufficient", closed: n, need: MIN_CLOSED };

  const total = trades.reduce((a, c) => a + c.pnl, 0);
  if (total <= 0) return { status: "unprofitable" };

  const returns = trades.map((c) => c.pnlPct);
  const avg = mean(returns);
  const sd = sampleStdev(returns);
  const t = sd === 0 ? (avg === 0 ? 0 : Infinity) : avg / (sd / Math.sqrt(n));
  const p = sd === 0 ? (avg === 0 ? 1 : 0) : studentTwoSidedP(t, n - 1);

  const wins = trades.filter((c) => c.pnl > 0);
  const grossProfit = wins.reduce((a, c) => a + c.pnl, 0);
  const sortedWins = wins.map((c) => c.pnl).sort((a, b) => b - a);
  const top1 = sortedWins[0] ?? 0;
  const top1Share = grossProfit > 0 ? top1 / grossProfit : 0;
  const flips = total - top1 <= 0;
  const k = Math.ceil(0.2 * n);
  const top20Share = grossProfit > 0 ? sortedWins.slice(0, k).reduce((a, v) => a + v, 0) / grossProfit : 0;

  const winRate = wins.length / n;
  let longest = 0;
  let run = 0;
  for (const c of trades) {
    run = c.pnl > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  const expected = winRate > 0 && winRate < 1 ? Math.log(n * (1 - winRate)) / Math.log(1 / winRate) : null;
  const streakUnusual = expected !== null && longest >= 5 && longest >= expected + 2;

  const significance = p > 0.1 ? 1 : p > 0.05 ? 0.5 : 0;
  const dependence = flips ? 1 : top1Share > 0.4 ? 0.5 : 0;
  const concentration = clamp((top20Share - 0.7) / 0.25, 0, 1);
  const smallSample = n < 30;
  let score = Math.round(35 * significance + 30 * dependence + 20 * concentration + 15 * Number(streakUnusual));
  if (smallSample) score = Math.min(score, 60);

  const lvl = level(score);
  const facts: string[] = [
    `Win rate ${fmt(winRate * 100, 0)}% dari ${n} transaksi tertutup.`,
    flips
      ? "Tanpa satu transaksi terbesar, hasil bersih jadi minus."
      : `Satu transaksi terbesar menyumbang ${fmt(top1Share * 100, 0)}% dari total profit.`,
    p > 0.05
      ? `Uji statistik belum meyakinkan (p ${fmt(p, 2)}), hasilnya masih bisa terjadi karena kebetulan.`
      : `Uji statistik cukup meyakinkan (p ${fmt(p, 2)}), hasilnya sulit dijelaskan hanya karena kebetulan.`,
  ];
  if (streakUnusual && expected !== null) {
    facts.push(`Rentetan menang ${longest} kali berturut turut lebih panjang dari perkiraan acak (sekitar ${fmt(expected, 0)}).`);
  }

  const summary =
    lvl === "rendah"
      ? "Hasilmu terlihat konsisten, bukan sekadar beruntung."
      : lvl === "sedang"
        ? "Sebagian hasil mungkin dibantu keberuntungan. Tunggu sampel yang lebih besar."
        : "Hasilmu kemungkinan besar dibantu keberuntungan. Hati hati menaikkan ukuran posisi.";

  return { status: "ok", score, level: lvl, facts: facts.slice(0, 3), summary, smallSample };
}
