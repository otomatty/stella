// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問8
export function addBoth(a: Promise<number>, b: Promise<number>): Promise<number> {
  return a.then((x) => b.then((y) => x + y));
}
