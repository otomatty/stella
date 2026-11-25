// 問5 定数 CATEGORY_NAMES を Record<Category, string> として宣言して export し（food は "食べ物"、drink は "飲み物"、other は "その他"）、categoryName(category) でその名前を返す
//     例: categoryName("drink") → "飲み物"
// 引数と戻り値に型注釈を付けます。

export type Category = "food" | "drink" | "other";

export const CATEGORY_NAMES: Record<Category, string> = {
  food: "食べ物",
  drink: "飲み物",
  other: "その他",
};

export function categoryName(category: Category): string {
  return CATEGORY_NAMES[category];
}
