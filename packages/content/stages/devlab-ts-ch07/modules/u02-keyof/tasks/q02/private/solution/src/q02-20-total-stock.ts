// 問20 Product の配列の、key（"price" か "stock"）のプロパティの合計を返す
//     例: totalStock(products, "stock") → 8
// 引数と戻り値に型注釈を付けます。

export type Product = { code: string; price: number; stock: number };

export function totalStock(products: readonly Product[], key: "price" | "stock"): number {
  let total = 0;
  for (const product of products) {
    total += product[key];
  }
  return total;
}
