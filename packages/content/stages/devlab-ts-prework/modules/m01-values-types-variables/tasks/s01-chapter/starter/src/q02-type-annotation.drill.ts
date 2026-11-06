// 01-q02 型注釈 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-annotation
//
// 次の20個の関数を書いてください。
// どの関数も、引数と戻り値に型注釈を付けること。引数の数と順番は、例のとおりにする。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 a から b を引いた数を返す
//     例: subtract(5, 3) → 2
export function subtract() {}

// 問2 名前の後ろに「さん」を付ける
//     例: honorific("山田") → "山田さん"
export function honorific() {}

// 問3 18歳以上なら true を返す
//     例: isAdult(18) → true
export function isAdult() {}

// 問4 text を times 回つなげた文字列を返す
//     例: repeatText("ab", 3) → "ababab"
export function repeatText() {}

// 問5 長方形の面積を返す
//     例: rectangleArea(3, 4) → 12
export function rectangleArea() {}

// 問6 姓と名を半角スペースでつなぐ
//     例: fullName("山田", "太郎") → "山田 太郎"
export function fullName() {}

// 問7 摂氏を華氏に変える（華氏 = 摂氏 × 9 ÷ 5 + 32）
//     例: celsiusToFahrenheit(100) → 212
export function celsiusToFahrenheit() {}

// 問8 偶数なら true を返す
//     例: isEven(4) → true
export function isEven() {}

// 問9 12時より前なら「おはよう、◯◯さん」、12時以降なら「こんにちは、◯◯さん」を返す
//     例: greet("山田", 9) → "おはよう、山田さん"
export function greet() {}

// 問10 名前の最初の1文字を返す
//     例: initial("Taro") → "T"
export function initial() {}

// 問11 percentOff パーセント引きの価格を返す（1円未満は切り捨て）
//     例: discountPrice(1000, 15) → 850
export function discountPrice() {}

// 問12 金額を3桁ごとのカンマ区切りにし、「円」を付ける
//     例: formatYen(1234) → "1,234円"
export function formatYen() {}

// 問13 text の文字数が length より多ければ true を返す
//     例: isLongerThan("hello", 3) → true
export function isLongerThan() {}

// 問14 半分の数を返す
//     例: half(7) → 3.5
export function half() {}

// 問15 ラベルの後ろに件数を「（◯件）」の形で付ける
//     例: labelWithCount("メッセージ", 3) → "メッセージ（3件）"
export function labelWithCount() {}

// 問16 value が min 以上 max 以下なら true を返す
//     例: isBetween(5, 1, 10) → true
export function isBetween() {}

// 問17 秒を分に変える（1分未満は切り捨て）
//     例: secondsToMinutes(150) → 2
export function secondsToMinutes() {}

// 問18 英字を大文字にして、最後に「!」を付ける
//     例: shout("hello") → "HELLO!"
export function shout() {}

// 問19 18歳以上で、免許を持っていれば true を返す
//     例: canDrive(20, true) → true
export function canDrive() {}

// 問20 char を width 個並べた文字列を返す
//     例: line("=", 5) → "====="
export function line() {}
