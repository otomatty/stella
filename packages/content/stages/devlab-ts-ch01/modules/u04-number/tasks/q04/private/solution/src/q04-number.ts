export function roundTo(value: number, digits: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("value は有限の数にしてください");
  }
  if (!Number.isInteger(digits) || digits < 0 || digits > 10) {
    throw new Error("digits は 0〜10 の整数にしてください");
  }
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function percent(part: number, total: number): number {
  if (total === 0) {
    throw new Error("total に 0 は使えません");
  }
  return roundTo((part / total) * 100, 1);
}
