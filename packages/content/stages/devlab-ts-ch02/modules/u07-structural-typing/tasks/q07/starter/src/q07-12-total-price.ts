// 問12 price の合計を返す。Product と Service が混ざった配列も渡せる。引数は readonly { price: number }[]
//     例: totalPrice([りんご, 相談]) → 3150
// 引数と戻り値には型注釈を付けます。

export type Product = { name: string; price: number; stock: number };

export type Service = { name: string; price: number; hours: number };

export function totalPrice() {}
