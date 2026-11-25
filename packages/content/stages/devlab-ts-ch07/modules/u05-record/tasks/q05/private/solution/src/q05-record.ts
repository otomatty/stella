// 問題
// Record<Keys, Type> は、キーが Keys、値が Type のオブジェクトの型です。
// Keys にユニオン型を渡すと、そのすべてのキーを持つオブジェクトになります（1つでも欠けると型エラー）。
// 型 Category と Item は定義済みです。
//
// 1. countByCategory(items): カテゴリごとの商品の数を Record<Category, number> で返す。
//    商品が1つもないカテゴリも 0 として入れる
//
// 2. totalByCategory(items): カテゴリごとの価格の合計を Record<Category, number> で返す
//
// 3. 定数 CATEGORY_LABELS を Record<Category, string> として宣言して export する。
//    food は "食べ物"、drink は "飲み物"、other は "その他"
//
// 4. indexByName(items): 商品名をキー、商品を値にした Record<string, Item> を返す（同じ名前なら後の方）
// 引数と戻り値に型注釈を付けます。

export type Category = "food" | "drink" | "other";
export type Item = { name: string; category: Category; price: number };

export function countByCategory(items: readonly Item[]): Record<Category, number> {
  const counts: Record<Category, number> = { food: 0, drink: 0, other: 0 };
  for (const item of items) {
    counts[item.category]++;
  }
  return counts;
}

export function totalByCategory(items: readonly Item[]): Record<Category, number> {
  const totals: Record<Category, number> = { food: 0, drink: 0, other: 0 };
  for (const item of items) {
    totals[item.category] += item.price;
  }
  return totals;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  food: "食べ物",
  drink: "飲み物",
  other: "その他",
};

export function indexByName(items: readonly Item[]): Record<string, Item> {
  const index: Record<string, Item> = {};
  for (const item of items) {
    index[item.name] = item;
  }
  return index;
}
