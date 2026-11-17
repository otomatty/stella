// 09-q05 import と export ドリル
//
// 教材: https://typescriptbook.jp/reference/import-export-require
//
// shared/q05-modules.lib.ts（書き換えないファイル）に、定数・型・関数が用意してあります。
// export の問題は、テストがこのファイルから import して確かめます。import の問題は、shared/q05-modules.lib から import して使います。
// import 文は、ファイルの先頭でなくても、その問題の範囲（「// 問N」の下）に書いてかまいません。
// import はどこに書いても、ファイルを読み込むときに最初に実行されます。同じ名前を2回 import しないこと（問ごとに使う名前は分けてある）。

// 問10 型 Product を import type で import し、cheapest(items) で値段がいちばん安い商品を返す（空なら undefined）。引数の型は readonly Product[]
//     例: cheapest([{ name: "a", price: 300 }, { name: "b", price: 100 }]) → { name: "b", price: 100 }
export function cheapest() {}
