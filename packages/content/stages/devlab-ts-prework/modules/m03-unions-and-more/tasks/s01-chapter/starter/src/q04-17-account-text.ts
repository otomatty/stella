// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 引数と戻り値には型注釈を付けること。
// 判別可能なユニオン型を自分で定義して export し、その型を使って関数を書く。
// switch を使うときは、すべての場合の case を書く（ESLint の switch-exhaustiveness-check。switch は04章で詳しく扱う）。

// 問17 型 Account（{ plan: "free" } か { plan: "paid"; until: string }）を定義して export し、accountText(account: Account) を書く。「無料」「有料（2026-12-31まで）」
//     例: accountText({ plan: "paid", until: "2026-12-31" }) → "有料（2026-12-31まで）"
// ここに型 Account と関数 accountText を書く
