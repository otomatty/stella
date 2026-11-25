// 問3 数値か undefined を受け取り、undefined なら fallback を返す
//     例: orDefault(undefined, 10) → 10
// 引数と戻り値に型注釈を付ける。
// ?? で、値がない場合を扱う。

export function orDefault(value: number | undefined, fallback: number): number {
  return value ?? fallback;
}
