// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining
//
// 引数と戻り値には型注釈を付けること。
// null や undefined かもしれない値は、?.（オプショナルチェーン）、??、=== null、=== undefined で扱う。
// == null のような書き方は使わない（ESLint の eqeqeq）。

// 問3 数値か undefined を受け取り、undefined なら fallback を返す
//     例: orDefault(undefined, 10) → 10
export function orDefault() {}
