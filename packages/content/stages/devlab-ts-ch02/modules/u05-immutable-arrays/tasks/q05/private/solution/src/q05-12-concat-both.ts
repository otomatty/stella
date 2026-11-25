// 問12 2つの配列をつないだ新しい配列を返す
//     例: concatBoth([1, 2], [3]) → [1, 2, 3]
// 引数と戻り値には型注釈を付けます。
// スプレッド構文で要素を展開し、新しい配列を作ります。
export function concatBoth(a: readonly number[], b: readonly number[]): number[] {
  return [...a, ...b];
}
