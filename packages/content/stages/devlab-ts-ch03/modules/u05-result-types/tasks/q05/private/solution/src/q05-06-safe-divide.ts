// 03-q05 成功と失敗を表す型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問6
export function safeDivide(a: number, b: number): Result {
  if (b === 0) {
    return { ok: false, error: "0で割ることはできません" };
  }
  return { ok: true, value: a / b };
}
