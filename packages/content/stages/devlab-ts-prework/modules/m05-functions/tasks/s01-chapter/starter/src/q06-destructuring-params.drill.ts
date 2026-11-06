// 05-q06 分割代入引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/destructuring-assignment-parameters
//       https://typescriptbook.jp/reference/functions/keyword-arguments-and-options-object-pattern
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// 引数の位置で分割代入して受け取る。例: function area({ width, height }: { width: number; height: number }) { … }
// 「省略したら◯◯」と書いたプロパティは、型では ? を付け、分割代入のところでデフォルト値を書く（{ x = 0 }: { x?: number }）。
// 配列やタプルも分割代入で受け取れる（[first]: readonly string[]）。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 { name } を受け取り「こんにちは、◯◯さん」を返す
//     例: hello({ name: "山田" }) → "こんにちは、山田さん"
export function hello() {}

// 問2 { width, height } の面積
//     例: areaOf({ width: 3, height: 4 }) → 12
export function areaOf() {}

// 問3 { first, last } を「姓 名」の順でつなぐ
//     例: fullName({ first: "太郎", last: "山田" }) → "山田 太郎"
export function fullName() {}

// 問4 { x, y } を「(x, y)」にする。x と y は、それぞれ省略したら 0
//     例: pointText({ x: 3 }) → "(3, 0)"
export function pointText() {}

// 問5 { size, color } を「M/black」の形にする。size を省略したら "M"、color を省略したら "black"
//     例: optionText({ color: "red" }) → "M/red"
export function optionText() {}

// 問6 { price, currency } を「1,200円」の形にする。currency を省略したら「円」
//     例: priceText({ price: 1200 }) → "1,200円"
export function priceText() {}

// 問7 配列を [first] で受け取り、最初の要素を返す。なければ undefined
//     例: firstOf(["a", "b"]) → "a"
export function firstOf() {}

// 問8 タプル [a, b] を受け取り、[b, a] を返す
//     例: swapped([1, 2]) → [2, 1]
export function swapped() {}

// 問9 { a, b } の合計
//     例: sumOfPair({ a: 2, b: 5 }) → 7
export function sumOfPair() {}

// 問10 { name, age } を「山田（30）」にする。age を省略したら「山田（?）」
//     例: userLabel({ name: "山田" }) → "山田（?）"
export function userLabel() {}

// 問11 { name, role } から { name, role } を作る。role を省略したら "member"
//     例: makeMember({ name: "山田" }) → { name: "山田", role: "member" }
export function makeMember() {}

// 問12 { page, perPage } から { offset, limit } を返す。offset は (page - 1) × perPage。page を省略したら 1、perPage を省略したら 10
//     例: pageRange({ page: 3 }) → { offset: 20, limit: 10 }
export function pageRange() {}

// 問13 { q, limit } を「q=…&limit=…」にする。limit を省略したら 10
//     例: queryText({ q: "ts" }) → "q=ts&limit=10"
export function queryText() {}

// 問14 { pref, city, line } をつなぐ。line を省略したら付けない
//     例: addressText({ pref: "東京都", city: "渋谷区" }) → "東京都渋谷区"
export function addressText() {}

// 問15 { width, height } の周りの長さ
//     例: perimeter({ width: 3, height: 4 }) → 14
export function perimeter() {}

// 問16 配列を [head, ...tail] で受け取り、{ head, tail } を返す
//     例: headAndTail([1, 2, 3]) → { head: 1, tail: [2, 3] }
export function headAndTail() {}

// 問17 { year, month, day } を「2026-12-04」の形にする（月と日は2桁）
//     例: ymd({ year: 2026, month: 12, day: 4 }) → "2026-12-04"
export function ymd() {}

// 問18 2つの点 { x, y } の距離を返す。分割代入で名前を付け替える（{ x: x1, y: y1 }）
//     例: distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 }) → 5
export function distanceBetween() {}

// 問19 { first, last } と、省略できる separator（デフォルト引数で " "）。「姓 + separator + 名」
//     例: nameWith({ first: "太郎", last: "山田" }, "・") → "山田・太郎"
export function nameWith() {}

// 問20 タプル [lat, lng] を「35.68, 139.76」の形にする
//     例: latLngText([35.68, 139.76]) → "35.68, 139.76"
export function latLngText() {}
