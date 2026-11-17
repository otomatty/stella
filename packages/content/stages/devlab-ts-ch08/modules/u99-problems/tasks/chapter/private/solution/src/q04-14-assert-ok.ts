// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type ApiResult = { ok: boolean; status: number };

// 問14
export async function assertOk(task: () => Promise<ApiResult>): Promise<number> {
  const result = await task();
  if (!result.ok) {
    throw new Error(`HTTP ${result.status}`);
  }
  return result.status;
}
