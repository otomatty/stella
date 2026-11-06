// 05-q01 関数宣言・関数式・アロー関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-declaration
//       https://typescriptbook.jp/reference/functions/function-expression
//       https://typescriptbook.jp/reference/functions/arrow-functions
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// 書き方（関数宣言・関数式・アロー関数）は、問題のコードに用意してある形のまま使う。引数、型、中身を書き足す。
// アロー関数は、中身が1つの式なら (n: number): number => n * 2 のように { } と return を省略できる。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 【関数宣言】3つの数を足す
//     例: add3(1, 2, 3) → 6
export function add3() {}

// 問2 【関数宣言】3乗を返す
//     例: cubeOf(3) → 27
export function cubeOf() {}

// 問3 【関数宣言】名と姓の頭文字を「T.Y.」の形にする
//     例: initials("Taro", "Yamada") → "T.Y."
export function initials() {}

// 問4 【関数宣言】時と分を、0時からの分にする
//     例: toMinutes(9, 30) → 570
export function toMinutes() {}

// 問5 【関数宣言】英字を含み、すべて大文字なら true
//     例: isAllUpper("ABC") → true
export function isAllUpper() {}

// 問6 【関数宣言】円の面積（Math.PI × 半径 × 半径）を返す
//     例: circleArea(1) → 3.14159…
export function circleArea() {}

// 問7 【関数宣言】曜日の番号（0が日曜、6が土曜）が土日なら true
//     例: isWeekendDay(6) → true
export function isWeekendDay() {}

// 問8 【関数式】半分にする
//     例: half(9) → 4.5
export const half = function () {};

// 問9 【関数式】符号を反転する
//     例: negate(3) → -3
export const negate = function () {};

// 問10 【関数式】文字列を「"」で囲む
//     例: quote("abc") → "\"abc\""
export const quote = function () {};

// 問11 【関数式】km をマイルにする（1マイル = 1.609km）。小数第2位までに四捨五入
//     例: kmToMiles(10) → 6.22
export const kmToMiles = function () {};

// 問12 【関数式】0〜1 の割合を「50%」の形にする（四捨五入して整数）
//     例: percentText(0.5) → "50%"
export const percentText = function () {};

// 問13 【関数式】7の倍数なら true
//     例: isMultipleOf7(21) → true
export const isMultipleOf7 = function () {};

// 問14 【関数式】半角スペースで区切った最後の単語を返す
//     例: lastWord("hello big world") → "world"
export const lastWord = function () {};

// 問15 【アロー関数】3倍にする
//     例: triple(4) → 12
export const triple = () => {};

// 問16 【アロー関数】0より大きければ true
//     例: isPositiveNumber(-1) → false
export const isPositiveNumber = () => {};

// 問17 【アロー関数】半角スペースで区切った最初の単語を返す
//     例: firstWord("hello world") → "hello"
export const firstWord = () => {};

// 問18 【アロー関数】半角スペースの数を返す
//     例: countSpaces("a b c") → 2
export const countSpaces = () => {};

// 問19 【アロー関数】2つの数の平均を返す
//     例: average2(3, 8) → 5.5
export const average2 = () => {};

// 問20 【アロー関数】気温が 25 以上なら "夏日"、それ未満は "普通" を返す（{ } と return を使って書く）
//     例: describeTemp(30) → "夏日"
export const describeTemp = () => {};
