// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問16
export function fastest(promises: Promise<string>[]): Promise<string> {
  return Promise.race(promises);
}
