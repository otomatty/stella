// 09-q05 import と export ドリル
//
// 教材: https://typescriptbook.jp/reference/import-export-require
//
// shared/q05-modules.lib.ts（書き換えないファイル）に、定数・型・関数が用意してあります。
// export の問題は、テストがこのファイルから import して確かめます。import の問題は、shared/q05-modules.lib から import して使います。
// import 文は、ファイルの先頭でなくても、その問題の範囲（「// 問N」の下）に書いてかまいません。
// import はどこに書いても、ファイルを読み込むときに最初に実行されます。同じ名前を2回 import しないこと（問ごとに使う名前は分けてある）。

// 問9 shared/q05-modules.lib の export をすべて shop という名前でまとめて import し（import * as shop）、shop.SITE_NAME を使って siteTitle(page) を書く
//     例: siteTitle("商品一覧") → "商品一覧 | サンプル商店"
export function siteTitle() {}
