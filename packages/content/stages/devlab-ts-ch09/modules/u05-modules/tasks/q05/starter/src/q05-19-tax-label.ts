// 09-q05 import と export ドリル
//
// 教材: https://typescriptbook.jp/reference/import-export-require
//
// shared/q05-modules.lib.ts（書き換えないファイル）に、定数・型・関数が用意してあります。
// export の問題は、テストがこのファイルから import して確かめます。import の問題は、shared/q05-modules.lib から import して使います。
// import 文は、ファイルの先頭でなくても、その問題の範囲（「// 問N」の下）に書いてかまいません。
// import はどこに書いても、ファイルを読み込むときに最初に実行されます。同じ名前を2回 import しないこと（問ごとに使う名前は分けてある）。

// 問19 TAX_RATE を import し、"消費税 10%" の形の文字列を返す taxLabel() を書く（TAX_RATE × 100 を Math.round で整数にする）
//     例: taxLabel() → "消費税 10%"
export function taxLabel() {}
