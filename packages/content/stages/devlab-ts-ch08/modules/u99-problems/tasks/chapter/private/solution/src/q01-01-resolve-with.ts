// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問1
export function resolveWith(value: string): Promise<string> {
  return Promise.resolve(value);
}
