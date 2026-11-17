// 04-q06 unknown型と型の絞り込み
//
// 教材: https://typescriptbook.jp/reference/statements/unknown
//       https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard
//
// 問題
// 型の分からない値（unknown）を受け取る関数を書いてください。引数と戻り値には型注釈を付けること。
// unknown の値は、typeof、instanceof、Array.isArray、=== null などで型を絞り込んでから使う。
//
// 1. describeValue(value)
//    値の種類と中身を文字列で返す
//    - 文字列:   "文字列(3文字)"       … 文字数
//    - 数値:     "数値(42)"
//    - 真偽値:   "真偽値(true)"
//    - null:     "null"
//    - undefined: "undefined"
//    - 配列:     "配列(要素2個)"
//    - Date:     "日付(2026-12-01)"   … toISOString の先頭10文字
//    - それ以外のオブジェクト: "オブジェクト"
//    - それ以外（関数など）: "その他"
//
// 2. toNumber(value)
//    有限の数値ならそのまま、数値に変換できる文字列（前後の空白を除いて空でないもの）なら変換した数値、
//    それ以外は null を返す。戻り値は number | null
//
// 3. sumNumbers(values)
//    配列の中の、有限の数値だけを合計する。引数は readonly unknown[]

export function describeValue() {}

export function toNumber() {}

export function sumNumbers() {}
