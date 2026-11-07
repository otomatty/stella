// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問15
export function pairOf(a: Promise<string>, b: Promise<number>): Promise<[string, number]> {
  return Promise.all([a, b]);
}
