// 01-q04 number型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/number
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// Math.round、Math.floor、Math.ceil、Math.abs、Math.sqrt、Number.isFinite、Number.parseInt などを使う。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 小数点以下を四捨五入する
//     例: roundOff(2.5) → 3
export function roundOff() {}

// 問2 1の位を切り捨てる（10の倍数にする）
//     例: floorTo10(123) → 120
export function floorTo10() {}

// 問3 100の倍数に切り上げる
//     例: ceilTo100(101) → 200
export function ceilTo100() {}

// 問4 2つの数の差の大きさ（絶対値）を返す
//     例: absDiff(3, 10) → 7
export function absDiff() {}

// 問5 a を b で割った余りを返す
//     例: remainder(10, 3) → 1
export function remainder() {}

// 問6 n が base の倍数なら true を返す
//     例: isMultipleOf(12, 4) → true
export function isMultipleOf() {}

// 問7 3乗した数を返す（** 演算子を使う）
//     例: cube(3) → 27
export function cube() {}

// 問8 平方根を返す。負の数なら Error を投げる
//     例: squareRoot(9) → 3
export function squareRoot() {}

// 問9 value を min 以上 max 以下に収める
//     例: clamp(15, 0, 10) → 10
export function clamp() {}

// 問10 小数第1位までの文字列にする（toFixed を使う）
//     例: toFixed1(3.14159) → "3.1"
export function toFixed1() {}

// 問11 文字列の先頭の整数を取り出す。取り出せなければ 0 を返す（Number.parseInt と Number.isNaN）
//     例: parseIntOrZero("42px") → 42
export function parseIntOrZero() {}

// 問12 NaN でも Infinity でもない数なら true を返す
//     例: isFiniteNumber(1.5) → true
export function isFiniteNumber() {}

// 問13 part が total の何パーセントかを、整数に四捨五入して返す
//     例: percentOf(1, 3) → 33
export function percentOf() {}

// 問14 2つの数の平均を返す
//     例: average2(3, 8) → 5.5
export function average2() {}

// 問15 分を秒に変える
//     例: minutesToSeconds(1.5) → 90
export function minutesToSeconds() {}

// 問16 km を m に変える
//     例: kmToMeters(1.5) → 1500
export function kmToMeters() {}

// 問17 直角三角形の2辺から、斜辺の長さを返す（Math.hypot または Math.sqrt）
//     例: hypotenuse(3, 4) → 5
export function hypotenuse() {}

// 問18 0以上の整数の桁数を返す
//     例: digitCount(12345) → 5
export function digitCount() {}

// 問19 小数第2位までに四捨五入する
//     例: roundTo2(1.234) → 1.23
export function roundTo2() {}

// 問20 華氏を摂氏に変え、小数第1位までに四捨五入する（摂氏 = (華氏 - 32) × 5 ÷ 9）
//     例: fahrenheitToCelsius(98.6) → 37
export function fahrenheitToCelsius() {}
