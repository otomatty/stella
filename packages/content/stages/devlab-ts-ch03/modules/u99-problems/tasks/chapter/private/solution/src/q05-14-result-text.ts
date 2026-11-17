// 03-q05 成功と失敗を表す型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問14
export function resultText(result: Result): string {
  return result.ok ? `成功: ${result.value}` : `失敗: ${result.error}`;
}
