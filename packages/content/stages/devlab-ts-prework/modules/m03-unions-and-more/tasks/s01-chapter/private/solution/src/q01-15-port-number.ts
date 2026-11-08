// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問15
export type Port = number | string;

export function portNumber(port: Port): number {
  return typeof port === "number" ? port : Number.parseInt(port, 10);
}
