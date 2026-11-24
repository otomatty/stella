// 問17 3教科の点数から、成績のオブジェクト { math, english, science } を作る
//     例: makeScore(80, 70, 90) → { math: 80, english: 70, science: 90 }
// 引数と戻り値には型注釈を付けます。
// オブジェクトの型は { name: string; age: number } のように書きます。型に type で名前を付けてもかまいません。
export function makeScore(
  math: number,
  english: number,
  science: number,
): { math: number; english: number; science: number } {
  return { math, english, science };
}
