// 03-q05 成功と失敗を表す型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問17
export function atLeast(result: Result, min: number): Result {
  if (result.ok && result.value < min) {
    return { ok: false, error: `${min}未満です` };
  }
  return result;
}
