// 問19 型 Discounted を Priced & { discount: number } として定義して export し、finalPrice(x: Discounted) を書く。price - discount を返す。0 より小さくはしない
//     例: finalPrice({ price: 1000, discount: 200 }) → 800
// 引数と戻り値に型注釈を付ける。
// type を使って、& でつないだ型に名前を付ける。

export type Priced = { price: number };

export type Discounted = Priced & { discount: number };

export function finalPrice(x: Discounted): number {
  return Math.max(x.price - x.discount, 0);
}
