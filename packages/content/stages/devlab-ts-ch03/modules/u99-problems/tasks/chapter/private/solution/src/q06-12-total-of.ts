// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Named = { name: string };

export type Priced = { price: number };

// 問12
export function totalOf(items: readonly (Named & Priced)[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price;
  }
  return total;
}
