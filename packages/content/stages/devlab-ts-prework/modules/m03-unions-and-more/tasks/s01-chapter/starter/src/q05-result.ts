// 03-q05 成功と失敗を表す型
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 問題
// 文字列を数値に変換する処理を、例外を使わずに「成功」と「失敗」を値で返す形で書いてください。
//
// 1. 型 ParseResult を、次の2つのユニオン型として定義して export する
//    - 成功: ok が true、value（数値）
//    - 失敗: ok が false、error（文字列）
//
// 2. parseNumber(text)
//    前後の空白を取り除いて数値に変換する。変換できれば成功を返す。
//    空の文字列、または有限の数値にならないときは、失敗を返す。error は "数値ではありません: <text>"
//    例: parseNumber(" 42 ") → { ok: true, value: 42 }
//        parseNumber("abc")  → { ok: false, error: "数値ではありません: abc" }
//    ヒント: Number(…)、Number.isFinite
//
// 3. unwrapOr(result, fallback)
//    成功なら value を、失敗なら fallback を返す
//
// 4. sumValid(results)
//    成功したものの value だけを合計する。引数は readonly ParseResult[]

export type ParseResult = unknown;

export function parseNumber() {}

export function unwrapOr() {}

export function sumValid() {}
