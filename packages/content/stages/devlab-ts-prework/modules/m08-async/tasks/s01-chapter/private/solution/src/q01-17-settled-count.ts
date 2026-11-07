// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問17
export function settledCount(promises: Promise<number>[]): Promise<number> {
  return Promise.allSettled(promises).then(
    (results) => results.filter((r) => r.status === "fulfilled").length,
  );
}
