// 問18 いちばん安いものの name を返す。同じ価格なら先に出てきた方。空の配列なら Error を投げる
//     例: cheapestName([相談, りんご]) → "りんご"
// 引数と戻り値には型注釈を付けます。

export type Product = { name: string; price: number; stock: number };

export type Service = { name: string; price: number; hours: number };

export function cheapestName(items: readonly { name: string; price: number }[]): string {
  const [first, ...rest] = items;
  if (first === undefined) {
    throw new Error("空の配列です");
  }
  let cheapest = first;
  for (const item of rest) {
    if (item.price < cheapest.price) {
      cheapest = item;
    }
  }
  return cheapest.name;
}
