// 問18 product の keys に並べたプロパティを "code=A1, price=150" の形にする
//     例: productText(product, ["code", "price"]) → "code=A1, price=150"
// 引数と戻り値に型注釈を付けます。
// keys の要素の型に keyof Product を使います。

export type Product = { code: string; price: number; stock: number };

export function productText(product: Product, keys: readonly (keyof Product)[]): string {
  return keys.map((key) => `${key}=${product[key]}`).join(", ");
}
