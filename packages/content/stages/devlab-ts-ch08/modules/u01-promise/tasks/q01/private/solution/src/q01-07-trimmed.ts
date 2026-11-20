// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問7
export function trimmed(promise: Promise<string>): Promise<string> {
  return promise.then((text) => text.trim());
}
