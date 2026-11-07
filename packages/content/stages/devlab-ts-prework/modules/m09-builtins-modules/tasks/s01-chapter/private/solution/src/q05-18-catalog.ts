// 09-q05 import と export ドリル
//
// 教材: https://typescriptbook.jp/reference/import-export-require

// 問18
import { SITE_NAME, products } from "./shared/q05-modules.lib";

export function catalog(): string {
  return `${SITE_NAME}: ${products.map((p) => p.name).join("、")}`;
}
