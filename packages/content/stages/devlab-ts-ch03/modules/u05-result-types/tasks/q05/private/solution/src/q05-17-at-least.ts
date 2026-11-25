// 問17 成功で value が min 未満なら「<min>未満です」の失敗にする。それ以外はそのまま返す
//     例: atLeast({ ok: true, value: 3 }, 5) → { ok: false, error: "5未満です" }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。
// ok で成功か失敗かを見分ける。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function atLeast(result: Result, min: number): Result {
  if (result.ok && result.value < min) {
    return { ok: false, error: `${min}未満です` };
  }
  return result;
}
