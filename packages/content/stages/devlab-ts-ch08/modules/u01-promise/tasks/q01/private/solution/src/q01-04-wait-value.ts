// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問4
export function waitValue(value: string, ms: number): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, ms);
  });
}
