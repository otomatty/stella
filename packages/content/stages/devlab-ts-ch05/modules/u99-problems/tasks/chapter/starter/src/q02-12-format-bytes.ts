// 05-q02 引数と戻り値の型、void ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-parameters
//       https://typescriptbook.jp/reference/functions/void-type
//       https://typescriptbook.jp/reference/functions/pass-by-value
//
// 引数と戻り値には型注釈を付けること。
// 何も返さない関数の戻り値の型は void。引数で受け取った配列やオブジェクトを書き換える関数は、引数を readonly にしない。
// 配列やオブジェクトは参照渡しなので、関数の中で書き換えると、呼び出し側の値も変わる。

// 問12 バイト数を、1024 以上なら「1.5 KB」、1024 × 1024 以上なら「2.0 MB」、それ未満なら「512 B」の形にする（KB と MB は小数第1位まで）
//     例: formatBytes(1536) → "1.5 KB"
export function formatBytes() {}
