// 09-q05 import と export ドリル
//
// 教材: https://typescriptbook.jp/reference/import-export-require
//
// 次の20問を解いてください。q05-modules.lib.ts（書き換えないファイル）に、定数・型・関数が用意してあります。
// export の問題は、テストがこのファイルから import して確かめます。import の問題は、q05-modules.lib から import して使います。
// import 文は、ファイルの先頭でなくても、その問題の範囲（「// 問N」の下）に書いてかまいません。
// import はどこに書いても、ファイルを読み込むときに最初に実行されます。同じ名前を2回 import しないこと（問ごとに使う名前は分けてある）。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 下の関数 double を、名前付き export にする（function の前に export を付ける）
//     例: double(4) → 8
function double(n: number): number {
  return n * 2;
}

// 問2 下の定数 MAX_ITEMS を export する
//     例: MAX_ITEMS → 10
const MAX_ITEMS = 10;

// 問3 下の型 Point を export する
//     例: import { type Point } from "./q05-modules.drill" で使える
type Point = { x: number; y: number };

// 問4 下の2つの関数 add と sub を、最後の export { … } の1行でまとめて export する（function の前に export は付けない）
//     例: add(1, 2) → 3、sub(5, 3) → 2
function add(a: number, b: number): number {
  return a + b;
}

function sub(a: number, b: number): number {
  return a - b;
}

// ここに export { … } を書く

// 問5 下の関数 internalSquare を、square という名前で export する（export { 元の名前 as 新しい名前 }）
//     例: square(3) → 9
function internalSquare(n: number): number {
  return n * n;
}

// ここに export { … as square } を書く

// 問6 q05-modules.lib から priceWithTax を import し、それを使って、税込みの金額を返す withTax(price) を書く
//     例: withTax(100) → 110
export function withTax() {}

// 問7 formatYen を yen という名前で import し（import { 元の名前 as 新しい名前 }）、yen を使って priceLabel(price) を書く
//     例: priceLabel(1200) → "1,200円"
export function priceLabel() {}

// 問8 q05-modules.lib のデフォルト export（関数 greet）を import し、greet(name) の後ろに "！" を付けて返す welcome(name) を書く
//     例: welcome("山田") → "ようこそ、山田さん！"
export function welcome() {}

// 問9 q05-modules.lib の export をすべて shop という名前でまとめて import し（import * as shop）、shop.SITE_NAME を使って siteTitle(page) を書く
//     例: siteTitle("商品一覧") → "商品一覧 | サンプル商店"
export function siteTitle() {}

// 問10 型 Product を import type で import し、cheapest(items) で値段がいちばん安い商品を返す（空なら undefined）。引数の型は readonly Product[]
//     例: cheapest([{ name: "a", price: 300 }, { name: "b", price: 100 }]) → { name: "b", price: 100 }
export function cheapest() {}

// 問11 q05-modules.lib の formatYen を、このファイルからそのまま re-export する（export { … } from …）
//     例: このファイルから import した formatYen が、q05-modules.lib の formatYen と同じものになる
// ここに re-export を書く

// 問12 q05-modules.lib の priceWithTax を、taxed という名前で re-export する
//     例: taxed(200) → 220
// ここに re-export を書く

// 問13 q05-modules.lib のデフォルト export を、greetUser という名前で re-export する（export { default as … } from …）
//     例: greetUser("佐藤") → "ようこそ、佐藤さん"
// ここに re-export を書く

// 問14 q05-modules.lib の型 Product を、型として re-export する（export type { … } from …）
//     例: import { type Product } from "./q05-modules.drill" で使える
// ここに re-export を書く

// 問15 q05-modules.lib の export をすべて、library という名前のまとまりとして re-export する（export * as … from …）
//     例: library.SITE_NAME → "サンプル商店"
// ここに re-export を書く

// 問16 下の関数 farewell を、このファイルのデフォルト export にする（export default）
//     例: import farewell from "./q05-modules.drill" で使える
function farewell(name: string): string {
  return `さようなら、${name}さん`;
}

// ここで farewell をデフォルト export する

// 問17 export const half = … の形で、n の半分を返すアロー関数を export する
//     例: half(5) → 2.5
// ここに half を書く

// 問18 SITE_NAME と products を import し、"サンプル商店: りんご、みかん、ぶどう" の形の文字列を返す catalog() を書く（商品名を「、」でつなぐ）
//     例: catalog() → "サンプル商店: りんご、みかん、ぶどう"
export function catalog() {}

// 問19 TAX_RATE を import し、"消費税 10%" の形の文字列を返す taxLabel() を書く（TAX_RATE × 100 を Math.round で整数にする）
//     例: taxLabel() → "消費税 10%"
export function taxLabel() {}

// 問20 下のクラス Stack を export する
//     例: new Stack() で作れる
class Stack {
  private items: number[] = [];

  push(n: number): void {
    this.items.push(n);
  }

  pop(): number | undefined {
    return this.items.pop();
  }

  get size(): number {
    return this.items.length;
  }
}
