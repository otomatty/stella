// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters
//
// 引数と戻り値には型注釈を付けること。
// 「省略できる」と書いた引数は、title?: string のように ? を付ける。省略されると undefined になるので、?? や === undefined で扱う。
// デフォルト引数（= 値）は使わず、? で書くこと（デフォルト引数は q04 で扱う）。

// 問8 price と、省略できる unit。「1,200円」の形。unit を省略したら「円」
//     例: priceLabel(1200, "ドル") → "1,200ドル"
export function priceLabel() {}
