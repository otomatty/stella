// 05-q01 関数宣言・関数式・アロー関数
//
// 教材: https://typescriptbook.jp/reference/functions/function-declaration
//       https://typescriptbook.jp/reference/functions/function-expression
//       https://typescriptbook.jp/reference/functions/arrow-functions
//
// 問題
// 温度の単位を変換する関数を、3つの書き方で書いてください。引数と戻り値には型注釈を付けること。
// 結果は、どれも小数第2位までに四捨五入する。
//
// 1. celsiusToFahrenheit(celsius)   … 関数宣言（function celsiusToFahrenheit(…) {…}）で書く
//    華氏 = 摂氏 × 9 ÷ 5 + 32
//
// 2. fahrenheitToCelsius(fahrenheit) … 関数式（const fahrenheitToCelsius = function (…) {…}）で書く
//    摂氏 = (華氏 - 32) × 5 ÷ 9
//
// 3. kelvinToCelsius(kelvin)        … アロー関数（const kelvinToCelsius = (…) => …）で書く
//    摂氏 = ケルビン - 273.15
//
// 4. convert(value, from, to)       … アロー関数で書く。from と to は "C"、"F"、"K" のどれか。
//    いったん摂氏に直してから to の単位にする。上の3つの関数を使うこと
//    （摂氏からケルビンは + 273.15）
//    例: convert(100, "C", "F") → 212
//
// 説明すること（答えは、この下に // のコメントで書く）
// - 関数宣言とアロー関数の違いを1つ

export function celsiusToFahrenheit() {}

export const fahrenheitToCelsius = function () {};

export const kelvinToCelsius = () => {};

export const convert = () => {};
