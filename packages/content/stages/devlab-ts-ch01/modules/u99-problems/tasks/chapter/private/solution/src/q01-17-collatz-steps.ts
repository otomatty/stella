// 01-q01 letとconst ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/let-and-const
//       https://typescriptbook.jp/reference/values-types-variables/vars-problems

// 問17
export function collatzSteps(n: number): number {
  let current = n;
  let steps = 0;
  while (current !== 1) {
    current = current % 2 === 0 ? current / 2 : current * 3 + 1;
    steps++;
  }
  return steps;
}
