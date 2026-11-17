// 01-q02 型注釈
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-annotation
//
// 問題
// 次の2つの関数を書いてください。引数と戻り値には、すべて型注釈を付けること。
//
// 1. formatPrice(price, unit)
//    金額を3桁ごとにカンマで区切り、後ろに単位を付けた文字列を返す
//    例: formatPrice(1200, "円")    → "1,200円"
//        formatPrice(500, "ドル")   → "500ドル"
//    ヒント: 数値の toLocaleString("ja-JP") を使う
//
// 2. describeMember(name, age, isLeader)
//    例: describeMember("佐藤", 28, true)  → "佐藤（28歳・リーダー）"
//        describeMember("鈴木", 31, false) → "鈴木（31歳）"

export function formatPrice() {}

export function describeMember() {}
