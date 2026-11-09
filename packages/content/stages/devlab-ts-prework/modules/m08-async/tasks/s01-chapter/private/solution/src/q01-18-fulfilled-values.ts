// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問18
export function fulfilledValues(promises: Promise<number>[]): Promise<number[]> {
  return Promise.allSettled(promises).then((results) =>
    results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
  );
}
