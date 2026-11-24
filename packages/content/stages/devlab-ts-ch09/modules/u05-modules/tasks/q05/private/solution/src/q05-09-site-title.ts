// 問9 shared/q05-modules.lib の export をすべて shop という名前でまとめて import し（import * as shop）、shop.SITE_NAME を使って siteTitle(page) を書く
//     例: siteTitle("商品一覧") → "商品一覧 | サンプル商店"

import * as shop from "./shared/q05-modules.lib";

export function siteTitle(page: string): string {
  return `${page} | ${shop.SITE_NAME}`;
}
