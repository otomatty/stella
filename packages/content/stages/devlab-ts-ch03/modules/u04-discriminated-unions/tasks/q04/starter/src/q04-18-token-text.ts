// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 引数と戻り値には型注釈を付けること。
// 判別可能なユニオン型を自分で定義して export し、その型を使って関数を書く。
// switch を使うときは、すべての場合の case を書く（ESLint の switch-exhaustiveness-check。switch は04章で詳しく扱う）。

// 問18 型 Token（{ type: "number"; value } か { type: "plus" } か { type: "minus" }）を定義して export し、tokenText(token: Token) を書く。number は数字、plus は "+"、minus は "-"
//     例: tokenText({ type: "plus" }) → "+"
// ここに型 Token と関数 tokenText を書く
