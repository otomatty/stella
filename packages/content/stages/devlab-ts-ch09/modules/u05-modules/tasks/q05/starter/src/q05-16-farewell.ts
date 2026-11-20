// 09-q05 import と export ドリル
//
// 教材: https://typescriptbook.jp/reference/import-export-require
//
// shared/q05-modules.lib.ts（書き換えないファイル）に、定数・型・関数が用意してあります。
// export の問題は、テストがこのファイルから import して確かめます。import の問題は、shared/q05-modules.lib から import して使います。
// import 文は、ファイルの先頭でなくても、その問題の範囲（「// 問N」の下）に書いてかまいません。
// import はどこに書いても、ファイルを読み込むときに最初に実行されます。同じ名前を2回 import しないこと（問ごとに使う名前は分けてある）。

// 問16 下の関数 farewell を、このファイルのデフォルト export にする（export default）
//     例: import farewell from "./q05-16-farewell" で使える
function farewell(name: string): string {
  return `さようなら、${name}さん`;
}

// ここで farewell をデフォルト export する
