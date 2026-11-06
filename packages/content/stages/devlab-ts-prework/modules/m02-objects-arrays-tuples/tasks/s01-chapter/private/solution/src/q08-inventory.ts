import { sum } from "./q04-array-type";

export type Item = {
  name: string;
  category: string;
  price: number;
  stock: number;
};

export type CategoryTotals = { [category: string]: number };

export function outOfStock(items: readonly Item[]): string[] {
  return items.filter((item) => item.stock === 0).map((item) => item.name);
}

export function totalByCategory(items: readonly Item[]): CategoryTotals {
  const totals: CategoryTotals = {};
  for (const item of items) {
    totals[item.category] = (totals[item.category] ?? 0) + item.price * item.stock;
  }
  return totals;
}

export function applySale(items: readonly Item[], category: string, percentOff: number): Item[] {
  return items.map((item) => {
    if (item.category !== category) {
      return item;
    }
    return { ...item, price: Math.floor((item.price * (100 - percentOff)) / 100) };
  });
}

export function inventoryReport(items: readonly Item[]): string {
  const value = sum(items.map((item) => item.price * item.stock));
  return `商品数 ${items.length}、在庫切れ ${outOfStock(items).length}、在庫金額 ${value.toLocaleString("ja-JP")}円`;
}
