// 04-q02 switch文
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough
//
// 問題
// 次の3つの関数を、switch 文を使って書いてください。引数と戻り値には型注釈を付けること。
//
// 1. daysInMonth(year, month)
//    その月の日数を返す。2月はうるう年なら 29、そうでなければ 28。
//    うるう年: 4で割り切れる年。ただし100で割り切れる年は除く。ただし400で割り切れる年は含む。
//    month が 1〜12 でなければ Error を投げる。
//    ヒント: case 4: case 6: のように case を並べると、同じ処理にまとめられる
//
// 2. weekdayName(day)
//    曜日の番号（0 が日曜、6 が土曜）を "日"〜"土" にする。0〜6 でなければ Error を投げる
//
// 3. calculate(a, operator, b)
//    operator は "+"、"-"、"*"、"/" のどれか。計算した結果を返す。"/" で b が 0 なら Error を投げる
//
// switch のすべての case で return するか、break を書くこと（書き忘れると次の case に進んでしまう）

export function daysInMonth() {}

export function weekdayName() {}

export function calculate() {}
