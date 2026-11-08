// 08-q02 async と await ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/async
//       https://typescriptbook.jp/reference/asynchronous/await

// 問19
export async function runAtOnce(tasks: readonly (() => Promise<string>)[]): Promise<string[]> {
  return await Promise.all(tasks.map((task) => task()));
}
