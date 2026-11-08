// 09-q05 import と export ドリル
//
// 教材: https://typescriptbook.jp/reference/import-export-require

// 問19
import { TAX_RATE } from "./shared/q05-modules.lib";

export function taxLabel(): string {
  return `消費税 ${Math.round(TAX_RATE * 100)}%`;
}
