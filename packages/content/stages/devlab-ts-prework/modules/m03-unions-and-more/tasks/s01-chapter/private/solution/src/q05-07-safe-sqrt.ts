// 03-q05 成功と失敗を表す型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問7
export function safeSqrt(n: number): Result {
  if (n < 0) {
    return { ok: false, error: "負の数です" };
  }
  return { ok: true, value: Math.sqrt(n) };
}
