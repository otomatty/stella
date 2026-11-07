// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration
//
// 引数と戻り値には型注釈を付けること。
// 関数を返す関数の戻り値の型は (x: number) => number のように書く。
// 返した関数の中から、外側の関数の変数（let で宣言したもの）を読み書きできる。呼ぶたびに値が残るのは、そのため（クロージャ）。

// 問12 { push, pop, size } を返す。push(n) で積み（何も返さない）、pop() で最後に積んだものを取り出して返す（空なら undefined）、size() で数を返す
//     例: const s = makeStack(); s.push(1); s.pop() → 1
export function makeStack() {}
