// 01-q01 letとconst ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/let-and-const
//       https://typescriptbook.jp/reference/values-types-variables/vars-problems

// 問13
export function compound(principal: number, rate: number, years: number): number {
  let amount = principal;
  for (let i = 0; i < years; i++) {
    amount *= 1 + rate / 100;
  }
  return Math.round(amount);
}
