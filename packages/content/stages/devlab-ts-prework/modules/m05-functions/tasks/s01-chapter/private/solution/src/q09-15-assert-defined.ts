// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions

// 問15
export function assertDefined(value: string | undefined): asserts value is string {
  if (value === undefined) {
    throw new Error("値がありません");
  }
}
