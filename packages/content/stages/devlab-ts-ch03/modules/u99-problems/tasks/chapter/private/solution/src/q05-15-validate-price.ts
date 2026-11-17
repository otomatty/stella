// 03-q05 成功と失敗を表す型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問15
export function validatePrice(price: number): Result {
  if (price < 0) {
    return { ok: false, error: "価格は0以上にしてください" };
  }
  if (!Number.isInteger(price)) {
    return { ok: false, error: "価格は整数にしてください" };
  }
  return { ok: true, value: price };
}
