// 09-q05 import と export ドリル
//
// 教材: https://typescriptbook.jp/reference/import-export-require

// 問9
import * as shop from "./shared/q05-modules.lib";

export function siteTitle(page: string): string {
  return `${page} | ${shop.SITE_NAME}`;
}
