// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 引数と戻り値には型注釈を付けること。
// type でユニオン型に名前を付けて export し、その型を使って関数を書く。
// ユニオン型の値は、typeof v === "number" や v === "欠席" で場合を分けてから使う（絞り込み）。

// 問11 型 Price（数値か "非売品"）を定義して export し、priceText(price: Price) を書く。数値なら「1,200円」、"非売品" ならそのまま
//     例: priceText(1200) → "1,200円"
// ここに型 Price と関数 priceText を書く
