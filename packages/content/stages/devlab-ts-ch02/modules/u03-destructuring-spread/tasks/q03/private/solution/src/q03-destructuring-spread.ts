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

export function updatePrice(product: Product, price: number): Product {
  return { ...product, price };
}

export function restock(product: Product, amount: number): Product {
  return { ...product, stock: product.stock + amount };
}

export function summary(product: Product): string {
  const { name, price, stock } = product;
  return `${name}: ${price}円（在庫 ${stock}）`;
}
