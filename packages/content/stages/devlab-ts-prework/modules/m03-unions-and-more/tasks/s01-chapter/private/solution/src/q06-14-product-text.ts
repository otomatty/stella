// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Named = { name: string };

export type Priced = { price: number };

export type Identified = { id: number };

// 問14
export type Product = Named & Priced & Identified;

export function productText(product: Product): string {
  return `#${product.id} ${product.name} ${product.price}円`;
}
