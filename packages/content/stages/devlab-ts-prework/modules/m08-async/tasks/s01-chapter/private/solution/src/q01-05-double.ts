// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問5
export function double(promise: Promise<number>): Promise<number> {
  return promise.then((n) => n * 2);
}
