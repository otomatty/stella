// 問15 価格を確かめる。負なら「価格は0以上にしてください」、整数でなければ「価格は整数にしてください」の失敗。問題なければその価格の成功
//     例: validatePrice(-1) → { ok: false, error: "価格は0以上にしてください" }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function validatePrice(price: number): Result {
  if (price < 0) {
    return { ok: false, error: "価格は0以上にしてください" };
  }
  if (!Number.isInteger(price)) {
    return { ok: false, error: "価格は整数にしてください" };
  }
  return { ok: true, value: price };
}
