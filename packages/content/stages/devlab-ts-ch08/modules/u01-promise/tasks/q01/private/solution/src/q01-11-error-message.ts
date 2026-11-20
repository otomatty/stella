// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問11
export function errorMessage(promise: Promise<unknown>): Promise<string> {
  return promise
    .then(() => "成功")
    .catch((error: unknown) => (error instanceof Error ? error.message : "不明なエラー"));
}
