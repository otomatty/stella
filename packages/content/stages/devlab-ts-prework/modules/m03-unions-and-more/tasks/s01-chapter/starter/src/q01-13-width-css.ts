// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 引数と戻り値には型注釈を付けること。
// type でユニオン型に名前を付けて export し、その型を使って関数を書く。
// ユニオン型の値は、typeof v === "number" や v === "欠席" で場合を分けてから使う（絞り込み）。

// 問13 型 Width（数値か "auto"）を定義して export し、widthCss(width: Width) を書く。数値なら「100px」、"auto" ならそのまま
//     例: widthCss(100) → "100px"
// ここに型 Width と関数 widthCss を書く
