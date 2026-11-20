// 05-q02 引数と戻り値の型、void
//
// 教材: https://typescriptbook.jp/reference/functions/function-parameters
//       https://typescriptbook.jp/reference/functions/void-type
//
// 問題
// 次の3つの関数を書いてください。引数と戻り値には型注釈を付けること。
//
// 1. clamp(value, min, max)
//    value を min 以上 max 以下に収めて返す。min が max より大きければ Error を投げる
//
// 2. logLine(lines, level, message)
//    lines の末尾に "[INFO] message" の形の行を足す。level は "info"、"warn"、"error" のどれかで、
//    大文字にして [ ] で囲む。何も返さない（戻り値の型は void）。引数の lines は string[]（書き換えるので readonly にしない）
//
// 3. formatDuration(seconds)
//    秒を「1時間2分3秒」の形にする。0 の単位は書かない。ただし 0 秒なら「0秒」
//    例: 3723 → "1時間2分3秒"、125 → "2分5秒"、3600 → "1時間"

export function clamp() {}

export function logLine() {}

export function formatDuration() {}
