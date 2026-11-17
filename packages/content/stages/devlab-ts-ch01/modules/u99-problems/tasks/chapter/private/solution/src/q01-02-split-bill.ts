// 01-q01 letとconst ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/let-and-const
//       https://typescriptbook.jp/reference/values-types-variables/vars-problems

// 問2
export function splitBill(total: number, people: number): number {
  const perPerson = total / people;
  return Math.ceil(perPerson / 100) * 100;
}
