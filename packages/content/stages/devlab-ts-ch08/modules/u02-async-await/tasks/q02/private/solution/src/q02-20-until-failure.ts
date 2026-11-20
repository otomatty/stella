// 08-q02 async と await ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/async
//       https://typescriptbook.jp/reference/asynchronous/await

// 問20
export async function untilFailure(tasks: readonly (() => Promise<string>)[]): Promise<string[]> {
  const results: string[] = [];
  for (const task of tasks) {
    try {
      results.push(await task());
    } catch {
      break;
    }
  }
  return results;
}
