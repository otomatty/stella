// 03-q05 成功と失敗を表す型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問12
export function firstError(results: readonly Result[]): string | undefined {
  for (const result of results) {
    if (!result.ok) {
      return result.error;
    }
  }
  return undefined;
}
