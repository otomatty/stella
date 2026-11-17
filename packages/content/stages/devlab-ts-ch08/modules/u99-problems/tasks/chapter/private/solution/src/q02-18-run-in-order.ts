// 08-q02 async と await ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/async
//       https://typescriptbook.jp/reference/asynchronous/await

// 問18
export async function runInOrder(tasks: readonly (() => Promise<string>)[]): Promise<string[]> {
  const results: string[] = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}
