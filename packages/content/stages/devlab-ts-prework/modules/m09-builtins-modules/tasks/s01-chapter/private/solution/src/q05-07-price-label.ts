// 09-q05 import と export ドリル
//
// 教材: https://typescriptbook.jp/reference/import-export-require

// 問7
import { formatYen as yen } from "./shared/q05-modules.lib";

export function priceLabel(price: number): string {
  return yen(price);
}
