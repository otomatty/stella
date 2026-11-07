// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 引数と戻り値には型注釈を付けること。
// 引数に string | number のようなユニオン型を直接書く。
// ユニオン型の値は、typeof v === "number" や v === "欠席" で場合を分けてから使う（絞り込み）。

// 問3 数値なら小数第2位までの文字列（toFixed(2)）、文字列ならそのまま返す
//     例: formatValue(3.14159) → "3.14"
export function formatValue() {}
