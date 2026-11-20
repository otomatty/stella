// 01-q01 letとconst ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/let-and-const
//       https://typescriptbook.jp/reference/values-types-variables/vars-problems

// 問7
export function countDown(n: number): string {
  let text = "";
  for (let i = n; i >= 1; i--) {
    text += `${i}, `;
  }
  return `${text}発射`;
}
