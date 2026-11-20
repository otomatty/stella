// 09-q05 import と export ドリル
//
// 教材: https://typescriptbook.jp/reference/import-export-require

// 問6
import { priceWithTax } from "./shared/q05-modules.lib";

export function withTax(price: number): number {
  return priceWithTax(price);
}
