export const round = (value: number): number => Math.round(value * 10000) / 10000;

export const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

export const stdDev = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const mu = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - mu) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

export const mapePct = (predicted: number[], actual: number[]): number => {
  if (predicted.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  const pctErrors = predicted.map((value, index) => {
    const actualValue = actual[index] ?? 0;
    if (actualValue === 0) {
      return Math.abs(value) > 0 ? 100 : 0;
    }
    return (Math.abs(actualValue - value) / Math.abs(actualValue)) * 100;
  });
  return round(mean(pctErrors));
};

export const buildFutureDate = (asOf: string, dayOffset: number): string => {
  const date = new Date(asOf);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
};

/** Linear interpolation quantile (q in [0, 1]). */
export const quantile = (values: number[], q: number): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const remainder = position - base;
  const lower = sorted[base] ?? 0;
  const upper = sorted[base + 1];
  if (upper === undefined) {
    return lower;
  }
  return lower + remainder * (upper - lower);
};
