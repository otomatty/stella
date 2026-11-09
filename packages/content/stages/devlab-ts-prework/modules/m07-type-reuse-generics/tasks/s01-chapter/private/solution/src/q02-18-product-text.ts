// 07-q02 keyof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/keyof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export type Product = { code: string; price: number; stock: number };

// 問18
export function productText(product: Product, keys: readonly (keyof Product)[]): string {
  return keys.map((key) => `${key}=${product[key]}`).join(", ");
}
