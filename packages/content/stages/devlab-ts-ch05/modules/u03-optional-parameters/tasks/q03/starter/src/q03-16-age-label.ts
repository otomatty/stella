// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters
//
// 引数と戻り値には型注釈を付けること。
// 「省略できる」と書いた引数は、title?: string のように ? を付ける。省略されると undefined になるので、?? や === undefined で扱う。
// デフォルト引数（= 値）は使わず、? で書くこと（デフォルト引数は q04 で扱う）。

// 問16 省略できる age だけを受け取る。「30歳」、省略したら「年齢不明」
//     例: ageLabel() → "年齢不明"
export function ageLabel() {}
