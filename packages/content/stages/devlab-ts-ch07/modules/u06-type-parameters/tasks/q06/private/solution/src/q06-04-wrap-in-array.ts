// 問4 値を1つだけ持つ配列にする
//     例: wrapInArray("a") → ["a"]
// 型変数を使い、unknown で型を置き換えないでください。

export function wrapInArray<T>(value: T): T[] {
  return [value];
}
