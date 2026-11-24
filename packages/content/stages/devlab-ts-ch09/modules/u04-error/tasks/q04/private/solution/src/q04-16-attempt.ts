// 問16 fn() が値を返したら { ok: true, value }、例外を投げたら { ok: false, error } を返す。Error でないものが投げられたら、String(値) を message にした Error にする
//     例: attempt(() => 5) → { ok: true, value: 5 }
// 引数と戻り値に型注釈を付けます。
// エラーの種類は instanceof で見分けます。

export function attempt(
  fn: () => number,
): { ok: true; value: number } | { ok: false; error: Error } {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}
