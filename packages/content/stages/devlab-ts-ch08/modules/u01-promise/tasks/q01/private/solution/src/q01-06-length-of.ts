// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問6
export function lengthOf(promise: Promise<string>): Promise<number> {
  return promise.then((text) => text.length);
}
