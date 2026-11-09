// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問13
export function allNumbers(promises: Promise<number>[]): Promise<number[]> {
  return Promise.all(promises);
}
