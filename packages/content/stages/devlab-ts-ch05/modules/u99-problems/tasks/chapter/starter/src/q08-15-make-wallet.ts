// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration
//
// 引数と戻り値には型注釈を付けること。
// 関数を返す関数の戻り値の型は (x: number) => number のように書く。
// 返した関数の中から、外側の関数の変数（let で宣言したもの）を読み書きできる。呼ぶたびに値が残るのは、そのため（クロージャ）。

// 問15 { deposit, withdraw, balance } を返す。deposit(n) と withdraw(n) は残高を変えて、変えた後の残高を返す。残高より多く引き出そうとしたら "残高が足りません" の Error を投げる
//     例: const w = makeWallet(1000); w.withdraw(300) → 700
export function makeWallet() {}
