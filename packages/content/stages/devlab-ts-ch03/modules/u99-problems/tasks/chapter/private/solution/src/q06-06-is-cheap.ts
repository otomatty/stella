// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Named = { name: string };

export type Priced = { price: number };

// 問6
export function isCheap(item: Named & Priced, limit: number): boolean {
  return item.price <= limit;
}
