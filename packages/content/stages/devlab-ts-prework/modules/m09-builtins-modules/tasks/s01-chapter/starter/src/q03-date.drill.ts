// 09-q03 Date ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/date
//
// 次の20問を、Date を使って書いてください。引数と戻り値には型注釈を付けること。
// 日付はその環境の時刻（ローカル時刻）で扱う。getFullYear、getMonth、getDate、getDay、getHours、getMinutes を使う。
// Date の中では、月は 0〜11（1月が 0）、曜日は 0〜6（日曜が 0）で数える。問題文の「月」は 1〜12 で書いている。
// 引数の Date は変えないこと。変えたいときは new Date(date.getTime()) でコピーしてから変える。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 年・月（1〜12）・日から、その日の 0時0分の Date を作る
//     例: makeDate(2026, 4, 1) → 2026年4月1日 0:00
export function makeDate() {}

// 問2 年を返す
//     例: yearOf(2026年4月1日) → 2026
export function yearOf() {}

// 問3 月を 1〜12 で返す
//     例: monthOf(2026年4月1日) → 4
export function monthOf() {}

// 問4 曜日を "日"・"月"・"火"・"水"・"木"・"金"・"土" のどれかで返す
//     例: weekdayName(2026年4月1日) → "水"
export function weekdayName() {}

// 問5 土曜日か日曜日なら true
//     例: isWeekend(2026年4月4日) → true
export function isWeekend() {}

// 問6 n 日後の新しい Date を返す（元の Date は変えない。n は負でもよい）
//     例: addDays(2026年4月30日, 1) → 2026年5月1日
export function addDays() {}

// 問7 h 時間後の新しい Date を返す（元の Date は変えない）
//     例: addHours(2026年4月1日 22:00, 3) → 2026年4月2日 1:00
export function addHours() {}

// 問8 "2026-04-01" の形の文字列を返す（月と日は2桁）
//     例: formatDate(2026年4月1日) → "2026-04-01"
export function formatDate() {}

// 問9 "09:05" の形の文字列を返す（時と分は2桁）
//     例: formatTime(9時5分) → "09:05"
export function formatTime() {}

// 問10 "2026年4月1日（水）" の形の文字列を返す（月と日は0を付けない）
//     例: formatJapanese(2026年4月1日) → "2026年4月1日（水）"
export function formatJapanese() {}

// 問11 "2026-04-01" の形の文字列から、その日の 0時0分（ローカル時刻）の Date を作る。形が違えば Error を投げる
//     例: parseDate("2026-04-01") → 2026年4月1日 0:00
export function parseDate() {}

// 問12 a と b が同じ日付なら true（時刻は無視する）
//     例: isSameDay(4月1日 9:00, 4月1日 23:00) → true
export function isSameDay() {}

// 問13 a が b より前（時刻まで比べる）なら true。Date どうしは getTime() の数で比べる
//     例: isBefore(4月1日 9:00, 4月1日 10:00) → true
export function isBefore() {}

// 問14 a の日付から b の日付までの日数を返す（b が前なら負）。時刻は無視する
//     例: daysBetween(4月1日 23:00, 4月2日 1:00) → 1
export function daysBetween() {}

// 問15 誕生日 birthday の人の、today の時点の満年齢を返す（誕生日の当日に1つ増える）
//     例: ageOn(2000年4月2日, 2026年4月1日) → 25
export function ageOn() {}

// 問16 同じ日の 0時0分0秒0ミリ秒の新しい Date を返す
//     例: startOfDay(4月1日 15:30) → 4月1日 0:00
export function startOfDay() {}

// 問17 同じ月の最終日の 0時0分の Date を返す（翌月の 0日 は、その月の最終日になる）
//     例: endOfMonth(2026年4月15日) → 2026年4月30日
export function endOfMonth() {}

// 問18 year 年 month 月（1〜12）の日数を返す
//     例: daysInMonth(2028, 2) → 29
export function daysInMonth() {}

// 問19 いちばん新しい（後の）Date を返す。空なら undefined
//     例: latest([4月1日, 4月3日, 4月2日]) → 4月3日
export function latest() {}

// 問20 古い順に並べた新しい配列を返す（元の配列は変えない）
//     例: sortDates([4月3日, 4月1日]) → [4月1日, 4月3日]
export function sortDates() {}
