// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 引数と戻り値には型注釈を付けること。
// type でユニオン型に名前を付けて export し、その型を使って関数を書く。
// ユニオン型の値は、typeof v === "number" や v === "欠席" で場合を分けてから使う（絞り込み）。

// 問18 型 UserId（文字列か数値）を定義して export し、sameUser(a: UserId, b: UserId) を書く。文字列にしたときに同じなら true
//     例: sameUser(1, "1") → true
// ここに型 UserId と関数 sameUser を書く
