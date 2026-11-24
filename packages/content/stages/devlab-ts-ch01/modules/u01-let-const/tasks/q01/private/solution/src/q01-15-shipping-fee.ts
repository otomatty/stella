// 問15 送料を返す。基本は500円。小計が3000円以上なら0円。会員なら小計に関係なく0円
//     例: shippingFee(2000, false) → 500
export function shippingFee(subtotal: number, isMember: boolean): number {
  let fee = 500;
  if (subtotal >= 3000 || isMember) {
    fee = 0;
  }
  return fee;
}
