// 05-q04 デフォルト引数
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters
//
// 問題
// 引数を省略したときの値（デフォルト引数。page = 1 のように書く）を使って、次の3つの関数を書いてください。
// デフォルト値を書いた引数には、型注釈を書かなくてよい（値から推論される）。それ以外の引数と戻り値には型注釈を付けること。
//
// 1. paginate(items, page = 1, perPage = 10)
//    page ページ目（1から数える）の要素を返す。引数の配列は readonly string[]。page が 1 未満なら Error を投げる
//    例: 25個の要素で paginate(items, 3) → 21〜25番目の5個
//
// 2. repeatText(text, times = 2, separator = "")
//    text を times 回、separator をはさんでつなぐ
//    例: repeatText("ab") → "abab"、repeatText("ab", 3, "-") → "ab-ab-ab"
//
// 3. formatPrice(price, currency = "円", withTax = false)
//    withTax が true なら 10% の税を足す（1円未満は切り捨て）。3桁ごとにカンマで区切り、currency を付ける
//    例: formatPrice(1000) → "1,000円"、formatPrice(1000, "円", true) → "1,100円"

export function paginate() {}

export function repeatText() {}

export function formatPrice() {}
