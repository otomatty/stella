// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問9
export function parseNumber(promise: Promise<string>): Promise<number> {
  return promise.then((text) => {
    const n = Number(text);
    if (Number.isNaN(n)) {
      throw new Error(`数ではありません: ${text}`);
    }
    return n;
  });
}
