// 07-q01 typeof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/typeof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types
//
// 定数と関数は定義済みです（書き換えない）。
// 型の位置で typeof 定数 と書くと、その定数の型になる。(typeof 配列)[number] で配列の要素の型、(typeof オブジェクト)["キー"] でプロパティの型を取り出せる。
// 型を書く問題は、型を手で書き写さず、必ず typeof を使って作ること（値を直したときに型も変わるように）。
// 関数を書く問題は、引数と戻り値に型注釈を付けること。型注釈にも typeof を使う。

export const VERSION = "1.2.3";

// 問9 型 Version を VERSION から作る（const で宣言した文字列なので、リテラル型 "1.2.3" になる）
// ここに型 Version を書く
