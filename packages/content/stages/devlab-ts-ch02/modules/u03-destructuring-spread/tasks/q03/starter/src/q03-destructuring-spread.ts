// 02-q03 分割代入とスプレッド構文
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/destructuring-assignment-from-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/spread-syntax-for-object
//
// 問題
// 商品を表す型 Product は定義済みです。次の3つの関数を書いてください。
// 引数と戻り値には型注釈を付けること。
//
// 1. updatePrice(product, price)
//    price だけを変えた、新しい Product を返す。スプレッド構文を使い、元の product は変えない
//
// 2. restock(product, amount)
//    stock を amount だけ増やした、新しい Product を返す。元の product は変えない
//
// 3. summary(product)
//    分割代入で name、price、stock を取り出し、"りんご: 150円（在庫 12）" の形の文字列を返す

export type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
};

export function updatePrice() {}

export function restock() {}

export function summary() {}
