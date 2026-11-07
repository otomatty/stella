// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining
//
// 引数と戻り値には型注釈を付けること。
// null や undefined かもしれない値は、?.（オプショナルチェーン）、??、=== null、=== undefined で扱う。
// == null のような書き方は使わない（ESLint の eqeqeq）。

// 問20 { lastLoginAt: Date | null } を「2026-12-01」の形にする（toISOString の先頭10文字）。null なら「未ログイン」
//     例: lastLoginText({ lastLoginAt: null }) → "未ログイン"
export function lastLoginText() {}
