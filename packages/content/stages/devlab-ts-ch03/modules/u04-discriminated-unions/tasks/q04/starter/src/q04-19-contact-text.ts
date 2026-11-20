// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 引数と戻り値には型注釈を付けること。
// 判別可能なユニオン型を自分で定義して export し、その型を使って関数を書く。
// switch を使うときは、すべての場合の case を書く（ESLint の switch-exhaustiveness-check。switch は04章で詳しく扱う）。

// 問19 型 Contact（{ by: "email"; address } か { by: "phone"; number }）を定義して export し、contactText(contact: Contact) を書く。「メール: a@example.com」「電話: 090-…」
//     例: contactText({ by: "email", address: "a@example.com" }) → "メール: a@example.com"
// ここに型 Contact と関数 contactText を書く
