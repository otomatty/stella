// 問16 所持金が価格以上で、在庫があれば true
//     例: canBuy(1000, 800, true) → true
// 戻り値には型注釈を付けてください。
// 判定式の結果を return の1行で返せます。
export function canBuy(money: number, price: number, inStock: boolean): boolean {
  return money >= price && inStock;
}
