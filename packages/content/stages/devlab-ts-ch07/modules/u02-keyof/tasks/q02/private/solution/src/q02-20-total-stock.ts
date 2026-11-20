// 07-q02 keyof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/keyof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export type Product = { code: string; price: number; stock: number };

// 問20
export function totalStock(products: readonly Product[], key: "price" | "stock"): number {
  let total = 0;
  for (const product of products) {
    total += product[key];
  }
  return total;
}
