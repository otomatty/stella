// 09-q05 import と export ドリル
//
// 教材: https://typescriptbook.jp/reference/import-export-require
//
// shared/q05-modules.lib.ts（書き換えないファイル）に、定数・型・関数が用意してあります。
// export の問題は、テストがこのファイルから import して確かめます。import の問題は、shared/q05-modules.lib から import して使います。
// import 文は、ファイルの先頭でなくても、その問題の範囲（「// 問N」の下）に書いてかまいません。
// import はどこに書いても、ファイルを読み込むときに最初に実行されます。同じ名前を2回 import しないこと（問ごとに使う名前は分けてある）。

// 問4 下の2つの関数 add と sub を、最後の export { … } の1行でまとめて export する（function の前に export は付けない）
//     例: add(1, 2) → 3、sub(5, 3) → 2
function add(a: number, b: number): number {
  return a + b;
}

function sub(a: number, b: number): number {
  return a - b;
}

// ここに export { … } を書く
