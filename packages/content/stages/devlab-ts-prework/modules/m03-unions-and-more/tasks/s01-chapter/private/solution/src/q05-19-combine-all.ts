// 03-q05 成功と失敗を表す型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問19
export function combineAll(results: readonly Result[]): Result {
  let total = 0;
  for (const result of results) {
    if (!result.ok) {
      return result;
    }
    total += result.value;
  }
  return { ok: true, value: total };
}
