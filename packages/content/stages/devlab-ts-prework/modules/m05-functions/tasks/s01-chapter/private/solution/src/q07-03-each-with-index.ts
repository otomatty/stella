// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問3
export function eachWithIndex(
  items: readonly string[],
  fn: (item: string, index: number) => void,
): void {
  for (const [index, item] of items.entries()) {
    fn(item, index);
  }
}
