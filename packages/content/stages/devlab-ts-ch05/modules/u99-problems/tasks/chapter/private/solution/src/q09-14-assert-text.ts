// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions

// 問14
export function assertText(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error("文字列ではありません");
  }
}
