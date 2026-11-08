// 01-q01 letとconst ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/let-and-const
//       https://typescriptbook.jp/reference/values-types-variables/vars-problems

// 問1
export function addTax(price: number): number {
  const tax = Math.floor(price * 0.1);
  return price + tax;
}
