// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining
//
// 引数と戻り値には型注釈を付けること。
// null や undefined かもしれない値は、?.（オプショナルチェーン）、??、=== null、=== undefined で扱う。
// == null のような書き方は使わない（ESLint の eqeqeq）。

// 問14 { phone?: string | null } の phone を返す。undefined でも null でも「なし」
//     例: phoneText({ phone: null }) → "なし"
export function phoneText() {}
