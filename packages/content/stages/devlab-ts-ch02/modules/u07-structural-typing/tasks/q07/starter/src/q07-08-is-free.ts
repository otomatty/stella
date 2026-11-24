// 問8 price が 0 なら true
//     例: isFree(無料相談) → true
// 引数と戻り値には型注釈を付けます。

export type Product = { name: string; price: number; stock: number };

export type Service = { name: string; price: number; hours: number };

export function isFree() {}
