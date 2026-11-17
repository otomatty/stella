// 01-q01 letとconst ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/let-and-const
//       https://typescriptbook.jp/reference/values-types-variables/vars-problems

// 問15
export function shippingFee(subtotal: number, isMember: boolean): number {
  let fee = 500;
  if (subtotal >= 3000 || isMember) {
    fee = 0;
  }
  return fee;
}
