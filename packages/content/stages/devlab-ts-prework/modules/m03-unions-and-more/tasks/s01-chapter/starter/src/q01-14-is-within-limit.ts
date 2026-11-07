// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 引数と戻り値には型注釈を付けること。
// type でユニオン型に名前を付けて export し、その型を使って関数を書く。
// ユニオン型の値は、typeof v === "number" や v === "欠席" で場合を分けてから使う（絞り込み）。

// 問14 型 Limit（数値か "無制限"）を定義して export し、isWithinLimit(value: number, limit: Limit) を書く。"無制限" なら常に true、数値なら value が limit 以下で true
//     例: isWithinLimit(5, 3) → false
// ここに型 Limit と関数 isWithinLimit を書く
