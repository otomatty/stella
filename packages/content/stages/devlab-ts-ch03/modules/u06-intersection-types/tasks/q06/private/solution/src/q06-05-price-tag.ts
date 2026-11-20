// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Named = { name: string };

export type Priced = { price: number };

// 問5
export function priceTag(item: Named & Priced): string {
  return `${item.name} ${item.price}円`;
}
