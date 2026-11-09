// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 引数と戻り値には型注釈を付けること。
// type でユニオン型に名前を付けて export し、その型を使って関数を書く。
// ユニオン型の値は、typeof v === "number" や v === "欠席" で場合を分けてから使う（絞り込み）。

// 問20 型 Temperature（数値か "不明"）を定義して export し、tempText(temp: Temperature) を書く。数値なら「25℃」、"不明" ならそのまま
//     例: tempText(25) → "25℃"
// ここに型 Temperature と関数 tempText を書く
