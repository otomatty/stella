// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping

export type Product = { name: string; price: number; stock: number };

export type Service = { name: string; price: number; hours: number };

// 問18
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
