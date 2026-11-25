// 問6 a ÷ b を返す。b が 0 なら、error が「0で割ることはできません」の失敗
//     例: safeDivide(6, 3) → { ok: true, value: 2 }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function safeDivide(a: number, b: number): Result {
  if (b === 0) {
    return { ok: false, error: "0で割ることはできません" };
  }
  return { ok: true, value: a / b };
}
