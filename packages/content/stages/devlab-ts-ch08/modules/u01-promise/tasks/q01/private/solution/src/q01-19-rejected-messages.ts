// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問19
export function rejectedMessages(promises: Promise<unknown>[]): Promise<string[]> {
  return Promise.allSettled(promises).then((results) =>
    results.flatMap((r) => {
      if (r.status === "fulfilled") {
        return [];
      }
      const reason: unknown = r.reason;
      return [reason instanceof Error ? reason.message : "不明なエラー"];
    }),
  );
}
