// 07-q01 typeof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/typeof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types
//
// 定数と関数は定義済みです（書き換えない）。
// 型の位置で typeof 定数 と書くと、その定数の型になる。(typeof 配列)[number] で配列の要素の型、(typeof オブジェクト)["キー"] でプロパティの型を取り出せる。
// 型を書く問題は、型を手で書き写さず、必ず typeof を使って作ること（値を直したときに型も変わるように）。
// 関数を書く問題は、引数と戻り値に型注釈を付けること。型注釈にも typeof を使う。

export const LEVELS = [1, 2, 3] as const;

// 問18 1 → 2 → 3 の順に次のレベルを返す（3 は 3 のまま）。引数と戻り値の型は (typeof LEVELS)[number]
//     例: nextLevel(1) → 2
export function nextLevel() {}
