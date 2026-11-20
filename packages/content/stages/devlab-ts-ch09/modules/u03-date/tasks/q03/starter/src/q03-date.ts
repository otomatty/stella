// 09-q03 Date
//
// 教材: https://typescriptbook.jp/reference/builtin-api/date
//
// 問題
// 日付を扱う関数を書いてください。日付は、その環境の時刻（ローカル時刻）で扱う（getFullYear、getMonth、getDate など）。
// 引数の Date は変えないこと（Date は setDate などで中身を書き換えられるので、新しい Date を作って返す）。
// 月は Date の中では 0〜11 で数える（1月が 0）ことに注意する。
//
// 1. addDays(date, n)
//    n 日後の新しい Date を返す。n は負でもよい。月や年をまたいでもよい。時刻はそのまま
//
// 2. formatDate(date)
//    "2026-04-01" の形の文字列を返す。月と日は2桁にする
//
// 3. daysBetween(a, b)
//    a の日付から b の日付までの日数を返す（b が a より前なら負の数）。時刻は無視して、日付だけで数える
//
// 4. isWeekend(date)
//    土曜日か日曜日なら true
//
// 5. endOfMonth(date)
//    date と同じ月の最終日の 0時0分の Date を返す（4月なら30日、2028年2月なら29日）
//
// 説明すること（答えは、この下に // のコメントで書く）
// - new Date(2026, 3, 31) は何月何日になるか。なぜそうなるか

export function addDays() {}

export function formatDate() {}

export function daysBetween() {}

export function isWeekend() {}

export function endOfMonth() {}
