// 07-q01 typeof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/typeof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types
//
// 定数と関数は定義済みです（書き換えない）。
// 型の位置で typeof 定数 と書くと、その定数の型になる。(typeof 配列)[number] で配列の要素の型、(typeof オブジェクト)["キー"] でプロパティの型を取り出せる。
// 型を書く問題は、型を手で書き写さず、必ず typeof を使って作ること（値を直したときに型も変わるように）。
// 関数を書く問題は、引数と戻り値に型注釈を付けること。型注釈にも typeof を使う。

export const ORIGIN = { x: 0, y: 0 };

// 問15 点を dx、dy だけ動かした新しい点を返す。点の型は typeof ORIGIN
//     例: movePoint({ x: 1, y: 2 }, 3, 4) → { x: 4, y: 6 }
export function movePoint() {}
