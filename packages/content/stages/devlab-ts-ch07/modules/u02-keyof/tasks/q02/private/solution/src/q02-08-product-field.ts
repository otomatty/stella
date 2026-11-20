// 07-q02 keyof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/keyof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export type Product = { code: string; price: number; stock: number };

// 問8
export function productField(product: Product, key: keyof Product): string | number {
  return product[key];
}
