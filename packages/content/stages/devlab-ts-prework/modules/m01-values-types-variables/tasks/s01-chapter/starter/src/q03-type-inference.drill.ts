// 01-q03 型推論 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-inference
//
// 次の20問を解いてください。
// 定数は、型注釈を書かずに export const で宣言する。
// 関数は、引数には型注釈を書き、戻り値には型注釈を書かない（推論に任せる）。
// テストは、推論された型が決められたとおりになっているかも確かめます。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 定数 SITE_NAME を宣言する。値は "Agora"。推論される型は "Agora"
// ここに SITE_NAME を宣言する

// 問2 定数 MAX_MEMBERS を宣言する。値は 50。推論される型は 50
// ここに MAX_MEMBERS を宣言する

// 問3 定数 IS_BETA を宣言する。値は true。推論される型は true
// ここに IS_BETA を宣言する

// 問4 定数 TAX_RATE を宣言する。値は 0.1。推論される型は 0.1
// ここに TAX_RATE を宣言する

// 問5 2倍の数を返す（戻り値は number に推論される）
//     例: double(4) → 8
export function double() {}

// 問6 数値を文字列にする（戻り値は string に推論される）
//     例: toText(42) → "42"
export function toText() {}

// 問7 0 なら true を返す（戻り値は boolean に推論される）
//     例: isZero(0) → true
export function isZero() {}

// 問8 正なら "plus"、負なら "minus"、0 なら "zero" を返す（戻り値は "plus" | "minus" | "zero" に推論される）
//     例: sign(-3) → "minus"
export function sign() {}

// 問9 60点以上なら "合格"、それ未満なら "不合格" を返す（戻り値は "合格" | "不合格" に推論される）
//     例: judge(60) → "合格"
export function judge() {}

// 問10 2乗した数を返す
//     例: square(5) → 25
export function square() {}

// 問11 2つの単語を半角スペースでつなぐ
//     例: joinWords("Hello", "World") → "Hello World"
export function joinWords() {}

// 問12 偶数なら半分にした数を、奇数なら undefined を返す（戻り値は number | undefined に推論される）
//     例: halfIfEven(8) → 4
export function halfIfEven() {}

// 問13 0〜11時なら "午前"、12〜23時なら "午後" を返す（戻り値は "午前" | "午後" に推論される）
//     例: ampm(13) → "午後"
export function ampm() {}

// 問14 2つの数のうち大きい方を返す
//     例: bigger(3, 8) → 8
export function bigger() {}

// 問15 文字数を返す
//     例: charCount("TypeScript") → 10
export function charCount() {}

// 問16 空の文字列なら true を返す
//     例: isEmptyText("") → true
export function isEmptyText() {}

// 問17 true なら "はい"、false なら "いいえ" を返す（戻り値は "はい" | "いいえ" に推論される）
//     例: yesNo(true) → "はい"
export function yesNo() {}

// 問18 次の年を返す
//     例: nextYear(2026) → 2027
export function nextYear() {}

// 問19 文字列を丸かっこ「()」で囲む
//     例: wrapParen("注") → "(注)"
export function wrapParen() {}

// 問20 text[0] で最初の文字を取り出して返す（戻り値は string | undefined に推論される。空の文字列では undefined になる）
//     例: firstChar("abc") → "a"
export function firstChar() {}
