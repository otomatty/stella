// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 引数と戻り値には型注釈を付けること。
// 判別可能なユニオン型を自分で定義して export し、その型を使って関数を書く。
// switch を使うときは、すべての場合の case を書く（ESLint の switch-exhaustiveness-check。switch は04章で詳しく扱う）。

// 問14 型 UserAction（{ kind: "click"; x; y } か { kind: "key"; key }）を定義して export し、actionText(event: UserAction) を書く。「click(10, 20)」「key(Enter)」
//     例: actionText({ kind: "key", key: "Enter" }) → "key(Enter)"
// ここに型 UserAction と関数 actionText を書く
