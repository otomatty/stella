// 問題
// 商品を表す型 Item は定義済みです。在庫を集計する関数を書いてください。
// 引数の配列は readonly Item[] にし、元の配列や商品のオブジェクトは変えないこと。
//
// 1. 型 CategoryTotals を、インデックス型（キーがカテゴリ名の文字列、値が数値）として定義して export する
//
// 2. outOfStock(items)
//    在庫が0の商品の名前を、配列の順に並べて返す
//
// 3. totalByCategory(items)
//    カテゴリごとの在庫金額（price × stock）の合計を、CategoryTotals で返す
//    例: { 文具: 20000, 飲料: 4500 }
//
// 4. applySale(items, category, percentOff)
//    category の商品だけを percentOff パーセント引きの価格にした、新しい配列を返す。
//    1円未満は切り捨てる。ほかのカテゴリの商品は、そのまま入れる
//    ヒント: 小数の誤差を避けるため、price * (100 - percentOff) / 100 の順で計算する
//
// 5. inventoryReport(items)
//    商品数（items の要素の数）、在庫切れ（在庫が0の商品の数）、在庫金額（price × stock の合計。
//    3桁ごとにカンマで区切る）を、"商品数 4、在庫切れ 1、在庫金額 24,500円" の形の文字列にして返す
//
// このファイルに書く関数（export は不要）
// - sum(numbers): readonly number[] の合計を返す。空の配列なら 0。
//   5. の在庫金額は、この sum で合計する。

function sum(numbers: readonly number[]): number {
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total;
}

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
