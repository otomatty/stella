// 02-q04 配列の型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/type-annotation-of-array
//       https://typescriptbook.jp/reference/values-types-variables/array/readonly-array
//       https://typescriptbook.jp/reference/values-types-variables/array/how-to-loop-an-array
//
// 引数と戻り値には型注釈を付けること。
// 引数の配列は、関数の中で書き換えないので readonly number[] や readonly string[] にする。戻り値の配列は number[] などでよい。
// for-of、map、filter、includes、indexOf、join、every などを使う。
// 配列の要素を numbers[0] のように取り出すと、型は number | undefined になる（要素がないかもしれないため）。

// 問20 すべての要素が0より大きければ true（every を使う）
//     例: allPositive([1, 2, 3]) → true
export function allPositive() {}
