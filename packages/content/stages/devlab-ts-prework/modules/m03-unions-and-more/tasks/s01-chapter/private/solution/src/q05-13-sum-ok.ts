// 03-q05 成功と失敗を表す型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問13
export function sumOk(results: readonly Result[]): number {
  let total = 0;
  for (const result of results) {
    if (result.ok) {
      total += result.value;
    }
  }
  return total;
}
