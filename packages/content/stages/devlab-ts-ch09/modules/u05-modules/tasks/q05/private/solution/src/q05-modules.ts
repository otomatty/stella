// 問題
// 下のコードは、ネットショップのカートの計算を1つのファイルにまとめたものです。
// これを q05-modules-price.ts、q05-modules-format.ts、q05-modules-cart.ts の3つのファイルに分け、このファイル（q05-modules.ts）には re-export だけを書いてください。
// q05-modules-cart.ts に足す確かめ以外は、関数の中身は変えずに、置き場所だけを変えること。
//
//   q05-modules-price.ts   TAX_RATE と priceWithTax を、名前付き export にする
//   q05-modules-format.ts  formatYen を、デフォルト export にする
//   q05-modules-cart.ts    型 CartItem と、addItem・cartTotal・cartSummary を、名前付き export にする。
//                          q05-modules-price.ts と q05-modules-format.ts から、使うものを import する
//
// このファイル（q05-modules.ts）には、次の3つの re-export だけを書く（関数や型の定義は残さない）
//   - q05-modules-cart.ts の型 CartItem と addItem・cartTotal・cartSummary を名前付きで re-export する
//   - q05-modules-price.ts の TAX_RATE と priceWithTax を re-export する
//   - q05-modules-format.ts のデフォルト export を、formatYen という名前で re-export する
//
// テスト（q05-modules.test.ts）は、それぞれのファイルから import して確かめます。
//
// 説明すること（答えは、この下に // のコメントで書く）
// - 名前付き export とデフォルト export の違い。自分ならどちらを使うか、その理由

export { type CartItem, addItem, cartSummary, cartTotal } from "./q05-modules-cart";
export { TAX_RATE, priceWithTax } from "./q05-modules-price";
export { default as formatYen } from "./q05-modules-format";
