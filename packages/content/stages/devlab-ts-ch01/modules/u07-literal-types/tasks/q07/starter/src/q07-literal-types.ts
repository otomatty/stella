// 01-q07 リテラル型
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//
// 問題
// 1. 関数 move(position, direction) を書いてください
//    - direction には "up" か "down" だけを渡せるように、リテラル型で型注釈を付ける
//    - "up" なら position + 1、"down" なら position - 1 を返す
//    ヒント: "up" | "down" のように | でつなぐと、どちらかの値だけを受け付ける型になる
//            （| の詳しい使い方は03章で扱う）
//
// 2. 定数 START_POSITION を、export を付けて宣言してください
//    - 値は 0。型注釈は書かずに、推論される型が 0 になるようにする
//
// 説明すること（答えは、この下に // のコメントで書く）
// - let で宣言した場合と const で宣言した場合で、推論される型がどう変わるか。なぜそうなるのか

export function move() {}

// ここに START_POSITION を宣言する
