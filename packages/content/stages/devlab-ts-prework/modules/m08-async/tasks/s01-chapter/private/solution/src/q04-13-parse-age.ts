// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

// 問13
export async function parseAge(task: () => Promise<string>): Promise<number> {
  const text = await task();
  const age = Number(text);
  if (!Number.isInteger(age) || age < 0) {
    throw new Error(`年齢が正しくありません: ${text}`);
  }
  return age;
}
