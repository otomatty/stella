// 03-q05 成功と失敗を表す型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問9
export function doubleResult(result: Result): Result {
  return result.ok ? { ok: true, value: result.value * 2 } : result;
}
