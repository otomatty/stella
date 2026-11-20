// 09-q03 Date ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/date
//
// Date を使って書いてください。引数と戻り値には型注釈を付けること。
// 日付はその環境の時刻（ローカル時刻）で扱う。getFullYear、getMonth、getDate、getDay、getHours、getMinutes を使う。
// Date の中では、月は 0〜11（1月が 0）、曜日は 0〜6（日曜が 0）で数える。問題文の「月」は 1〜12 で書いている。
// 引数の Date は変えないこと。変えたいときは new Date(date.getTime()) でコピーしてから変える。

// 問11 "2026-04-01" の形の文字列から、その日の 0時0分（ローカル時刻）の Date を作る。形が違えば Error を投げる
//     例: parseDate("2026-04-01") → 2026年4月1日 0:00
export function parseDate() {}
