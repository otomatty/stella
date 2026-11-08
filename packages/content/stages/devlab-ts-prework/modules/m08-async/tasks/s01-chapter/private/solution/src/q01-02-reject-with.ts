// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問2
export function rejectWith(message: string): Promise<never> {
  return Promise.reject(new Error(message));
}
