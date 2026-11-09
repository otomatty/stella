// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 引数と戻り値には型注釈を付けること。
// 引数に string | number のようなユニオン型を直接書く。
// ユニオン型の値は、typeof v === "number" や v === "欠席" で場合を分けてから使う（絞り込み）。

// 問4 数値なら2倍、文字列なら2回つなげたものを返す
//     例: doubleValue("ab") → "abab"
export function doubleValue() {}
