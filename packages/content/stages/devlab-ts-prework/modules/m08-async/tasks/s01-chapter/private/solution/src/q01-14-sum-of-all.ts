// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問14
export function sumOfAll(promises: Promise<number>[]): Promise<number> {
  return Promise.all(promises).then((values) => values.reduce((sum, n) => sum + n, 0));
}
