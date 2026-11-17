// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining
//
// 引数と戻り値には型注釈を付けること。
// null や undefined かもしれない値は、?.（オプショナルチェーン）、??、=== null、=== undefined で扱う。
// == null のような書き方は使わない（ESLint の eqeqeq）。

// 問15 { manager: { name } | null } の manager の name を返す。manager が null なら「未定」
//     例: managerName({ manager: null }) → "未定"
export function managerName() {}
