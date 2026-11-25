// 問12 shared/q05-modules.lib の priceWithTax を、taxed という名前で re-export する
//     例: taxed(200) → 220

export { priceWithTax as taxed } from "./shared/q05-modules.lib";
