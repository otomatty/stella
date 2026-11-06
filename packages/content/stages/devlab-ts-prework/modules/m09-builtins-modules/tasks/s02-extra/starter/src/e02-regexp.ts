// 09-e02 発展問題 正規表現（RegExp）
//
// 教材: https://typescriptbook.jp/reference/builtin-api/regexp
//
// 問題
// 次の関数を、正規表現を使って書いてください。
//
// 1. isPostalCode(text)
//    "123-4567" の形（数字3桁、ハイフン、数字4桁）だけなら true。前後に余計な文字があれば false
//
// 2. extractHashtags(text)
//    文章の中の "#" で始まるハッシュタグを、"#" を除いて出てきた順に配列で返す。
//    ハッシュタグは "#" の後ろ、空白か次の "#" の手前まで。例: "今日は #TypeScript と #型 の勉強" → ["TypeScript", "型"]
//
// 3. maskPhone(text)
//    文章の中の電話番号 "090-1234-5678" の形（数字3桁-4桁-4桁）を、すべて "090-****-5678" のように真ん中だけ隠す
//
// 4. parseLogLine(line)
//    "[ERROR] 2026-04-01 09:00:00 接続できません" の形の1行を読み、
//    { level: "ERROR", time: "2026-04-01 09:00:00", message: "接続できません" } を返す。
//    level は INFO・WARN・ERROR のどれか。形が違えば null を返す。名前付きキャプチャグループ（(?<level>…)）を使う
//
// 5. camelToKebab(name)
//    "userName" → "user-name"、"getHTTPStatus" → "get-h-t-t-p-status" のように、大文字の前に "-" を入れて小文字にする
//
// 説明すること（答えは、この下に // のコメントで書く）
// - g フラグを付けた正規表現を、変数に入れて test で何度も使うと、どんなことが起きるか（lastIndex）

export type LogLine = { level: "INFO" | "WARN" | "ERROR"; time: string; message: string };

export function isPostalCode() {}

export function extractHashtags() {}

export function maskPhone() {}

export function parseLogLine() {}

export function camelToKebab() {}
