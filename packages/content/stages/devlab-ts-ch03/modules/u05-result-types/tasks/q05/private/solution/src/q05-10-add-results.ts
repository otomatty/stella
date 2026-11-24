// 問10 両方成功なら value を足した成功。失敗があれば、先に見つかった失敗（a、b の順）を返す
//     例: addResults({ ok: true, value: 1 }, { ok: true, value: 2 }) → { ok: true, value: 3 }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。
// ok で成功か失敗かを見分ける。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function addResults(a: Result, b: Result): Result {
  if (!a.ok) {
    return a;
  }
  if (!b.ok) {
    return b;
  }
  return { ok: true, value: a.value + b.value };
}
