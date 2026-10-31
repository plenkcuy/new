import {
  adx,
  cmf,
  macdHistogram,
  ema,
  obvRising,
  pointOfControl,
  rsi,
  stochastic,
  williamsR,
  type Candle,
} from "./indicators";

export type Bias = "LONG" | "SHORT" | "NETRAL";
export type Vote = 1 | 0 | -1;

export const FUNDING_ACUAN = 0;
export const BATAS_SKOR = 3;
export const BATAS_SKOR_TANPA_OI = 2;

export type DerivativeInput = {
  priceChange24h: number;
  oiChange24h: number | null;
  funding: number | null;
  ratio: number | null;
};

export type Metric = { point: number; text: string };

export type DerivativeResult = {
  oi: Metric;
  funding: Metric;
  ls: Metric;
  total: number;
  batas: number;
  bias: Bias;
};

export function scoreDerivatives(input: DerivativeInput): DerivativeResult {
  const priceUp = input.priceChange24h > 0;

  let oi: Metric = { point: 0, text: "Data open interest belum tersedia." };
  if (input.oiChange24h !== null) {
    const oiUp = input.oiChange24h > 0;
    if (priceUp && oiUp) oi = { point: 2, text: "Harga naik dan OI naik: tren naik kuat, ada uang baru masuk." };
    else if (priceUp) oi = { point: 0, text: "Harga naik tapi OI turun: kenaikan lemah dan rawan koreksi." };
    else if (oiUp) oi = { point: -2, text: "Harga turun dan OI naik: tren turun kuat, tekanan jual baru masuk." };
    else oi = { point: 0, text: "Harga turun dan OI turun: tekanan turun mulai melemah." };
  }

  let funding: Metric = { point: 0, text: "Data funding rate belum tersedia." };
  if (input.funding !== null) {
    if (input.funding > FUNDING_ACUAN) funding = { point: 1, text: "Funding positif: pasar didominasi pembeli (long)." };
    else if (input.funding < FUNDING_ACUAN) funding = { point: -1, text: "Funding negatif: pasar didominasi penjual (short)." };
    else funding = { point: 0, text: "Funding netral." };
  }

  let ls: Metric = { point: 0, text: "Data long short ratio belum tersedia." };
  if (input.ratio !== null) {
    if (input.ratio > 1) ls = { point: 1, text: "Lebih banyak trader di posisi long: sentimen condong bullish." };
    else if (input.ratio < 1) ls = { point: -1, text: "Lebih banyak trader di posisi short: sentimen condong bearish." };
    else ls = { point: 0, text: "Posisi long dan short seimbang." };
  }

  const total = oi.point + funding.point + ls.point;
  const batas = input.oiChange24h === null ? BATAS_SKOR_TANPA_OI : BATAS_SKOR;
  const bias: Bias = total >= batas ? "LONG" : total <= -batas ? "SHORT" : "NETRAL";
  return { oi, funding, ls, total, batas, bias };
}

export type TechInput = {
  close: number;
  ema21: number;
  macdHist: number;
  adx: number;
  stochK: number;
  stochD: number;
  rsi: number;
  willR: number;
  obvRising: boolean;
  cmf: number;
  poc: number;
};

export function computeTech(candles: Candle[]): TechInput | null {
  const closes = candles.map((c) => c.c);
  const ema21 = ema(closes, 21);
  const hist = macdHistogram(closes);
  const adxValue = adx(candles);
  const stoch = stochastic(candles);
  const rsiValue = rsi(closes);
  const willR = williamsR(candles);
  const obv = obvRising(candles);
  const cmfValue = cmf(candles);
  const poc = pointOfControl(candles);
  if (
    !ema21.length ||
    hist === null ||
    adxValue === null ||
    !stoch ||
    rsiValue === null ||
    willR === null ||
    obv === null ||
    cmfValue === null ||
    poc === null
  ) {
    return null;
  }
  return {
    close: closes[closes.length - 1],
    ema21: ema21[ema21.length - 1],
    macdHist: hist,
    adx: adxValue,
    stochK: stoch.k,
    stochD: stoch.d,
    rsi: rsiValue,
    willR,
    obvRising: obv,
    cmf: cmfValue,
    poc,
  };
}

export type Groups = { tren: Vote; momentum: Vote; volume: Vote };

export function voteTren(t: TechInput): Vote {
  if (t.adx < 20) return 0;
  if (t.close > t.ema21 && t.macdHist > 0) return 1;
  if (t.close < t.ema21 && t.macdHist < 0) return -1;
  return 0;
}

export function voteMomentum(t: TechInput): Vote {
  const bull = Number(t.stochK > t.stochD) + Number(t.rsi > 50) + Number(t.willR > -50);
  const bear = Number(t.stochK < t.stochD) + Number(t.rsi < 50) + Number(t.willR < -50);
  if (bull >= 2 && bull > bear) return 1;
  if (bear >= 2 && bear > bull) return -1;
  return 0;
}

export function voteVolume(t: TechInput, derivativeBias: Bias | null): Vote {
  const bull =
    Number(t.obvRising) + Number(t.cmf > 0) + Number(t.close > t.poc) + Number(derivativeBias === "LONG");
  const bear =
    Number(!t.obvRising) + Number(t.cmf < 0) + Number(t.close < t.poc) + Number(derivativeBias === "SHORT");
  return bull > bear ? 1 : bear > bull ? -1 : 0;
}

export function decide(groups: Groups): { bias: Bias; reason: string } {
  const { tren, momentum, volume } = groups;
  if (tren === 0) return { bias: "NETRAL", reason: "Tren belum jelas atau pasar sedang sideways, tunggu konfirmasi." };
  const agree: string[] = [];
  if (momentum === tren) agree.push("momentum");
  if (volume === tren) agree.push("volume dan posisi");
  if (!agree.length) return { bias: "NETRAL", reason: "Tren belum didukung momentum maupun volume, sinyal belum cukup." };
  const side = tren === 1 ? "naik" : "turun";
  return {
    bias: tren === 1 ? "LONG" : "SHORT",
    reason: `Tren ${side} didukung ${agree.join(" serta ")}.`,
  };
}
