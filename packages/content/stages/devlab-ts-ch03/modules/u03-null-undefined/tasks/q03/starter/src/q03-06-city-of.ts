// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining
//
// 引数と戻り値には型注釈を付けること。
// null や undefined かもしれない値は、?.（オプショナルチェーン）、??、=== null、=== undefined で扱う。
// == null のような書き方は使わない（ESLint の eqeqeq）。

// 問6 { address?: { city } } の city を返す。address がなければ undefined
//     例: cityOf({ address: { city: "渋谷区" } }) → "渋谷区"
export function cityOf() {}
