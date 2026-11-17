// 01-q01 letとconst ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/let-and-const
//       https://typescriptbook.jp/reference/values-types-variables/vars-problems

// 問19
export function fibonacci(n: number): number {
  let prev = 0;
  let current = 1;
  for (let i = 0; i < n; i++) {
    const next = prev + current;
    prev = current;
    current = next;
  }
  return prev;
}
