// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration
//
// 引数と戻り値には型注釈を付けること。
// 関数を返す関数の戻り値の型は (x: number) => number のように書く。
// 返した関数の中から、外側の関数の変数（let で宣言したもの）を読み書きできる。呼ぶたびに値が残るのは、そのため（クロージャ）。

// 問14 呼ぶたびに items を先頭から順に返し、最後まで行ったら先頭に戻る関数を返す。空の配列なら Error を投げる
//     例: const next = makeCycler(["a", "b"]); next() → "a"、"b"、"a"…
export function makeCycler() {}
