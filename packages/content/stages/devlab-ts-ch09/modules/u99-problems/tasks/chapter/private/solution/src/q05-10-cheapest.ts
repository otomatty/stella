// 09-q05 import と export ドリル
//
// 教材: https://typescriptbook.jp/reference/import-export-require

// 問10
import type { Product } from "./shared/q05-modules.lib";

export function cheapest(items: readonly Product[]): Product | undefined {
  let result: Product | undefined;
  for (const item of items) {
    if (result === undefined || item.price < result.price) {
      result = item;
    }
  }
  return result;
}
