// 01-q01 letとconst ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/let-and-const
//       https://typescriptbook.jp/reference/values-types-variables/vars-problems

// 問11
export function digitSum(n: number): number {
  let rest = n;
  let total = 0;
  while (rest > 0) {
    total += rest % 10;
    rest = Math.floor(rest / 10);
  }
  return total;
}
