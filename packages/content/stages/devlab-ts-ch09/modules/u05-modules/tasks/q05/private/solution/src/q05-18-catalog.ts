// 問18 SITE_NAME と products を import し、"サンプル商店: りんご、みかん、ぶどう" の形の文字列を返す catalog() を書く（商品名を「、」でつなぐ）
//     例: catalog() → "サンプル商店: りんご、みかん、ぶどう"
// import 元は ./shared/q05-modules.lib です。

import { SITE_NAME, products } from "./shared/q05-modules.lib";

export function catalog(): string {
  return `${SITE_NAME}: ${products.map((p) => p.name).join("、")}`;
}
