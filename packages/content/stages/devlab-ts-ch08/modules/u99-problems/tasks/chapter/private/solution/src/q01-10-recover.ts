// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問10
export function recover(promise: Promise<number>): Promise<number> {
  return promise.catch(() => 0);
}
