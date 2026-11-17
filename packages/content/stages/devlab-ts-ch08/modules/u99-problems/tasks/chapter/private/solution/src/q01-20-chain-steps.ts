// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise

// 問20
export function chainSteps(
  start: number,
  steps: ((n: number) => Promise<number>)[],
): Promise<number> {
  return steps.reduce((acc, step) => acc.then(step), Promise.resolve(start));
}
