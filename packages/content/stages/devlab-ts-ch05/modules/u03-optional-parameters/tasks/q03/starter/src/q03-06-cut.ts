// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters
//
// 引数と戻り値には型注釈を付けること。
// 「省略できる」と書いた引数は、title?: string のように ? を付ける。省略されると undefined になるので、?? や === undefined で扱う。
// デフォルト引数（= 値）は使わず、? で書くこと（デフォルト引数は q04 で扱う）。

// 問6 text と、省略できる max。max 文字を超えたら、max 文字に切って「…」を付ける。省略したら 10
//     例: cut("TypeScript入門講座", 6) → "TypeSc…"
export function cut() {}
