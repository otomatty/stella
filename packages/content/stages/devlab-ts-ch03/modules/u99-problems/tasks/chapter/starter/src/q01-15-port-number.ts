// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 引数と戻り値には型注釈を付けること。
// type でユニオン型に名前を付けて export し、その型を使って関数を書く。
// ユニオン型の値は、typeof v === "number" や v === "欠席" で場合を分けてから使う（絞り込み）。

// 問15 型 Port（数値か文字列）を定義して export し、portNumber(port: Port) を書く。文字列なら Number.parseInt で数値にする
//     例: portNumber("8080") → 8080
// ここに型 Port と関数 portNumber を書く
