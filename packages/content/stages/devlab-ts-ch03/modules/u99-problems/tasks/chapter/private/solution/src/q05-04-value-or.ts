// 03-q05 成功と失敗を表す型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問4
export function valueOr(result: Result, fallback: number): number {
  return result.ok ? result.value : fallback;
}
