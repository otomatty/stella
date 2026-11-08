// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問12
export function logDone(promise: Promise<number>, log: string[]): Promise<number> {
  return promise.finally(() => {
    log.push("done");
  });
}
