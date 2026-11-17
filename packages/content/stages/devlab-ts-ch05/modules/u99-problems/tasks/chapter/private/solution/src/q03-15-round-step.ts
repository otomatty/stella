// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問15
export function roundStep(n: number, step?: number): number {
  const s = step ?? 1;
  return Math.round(n / s) * s;
}
