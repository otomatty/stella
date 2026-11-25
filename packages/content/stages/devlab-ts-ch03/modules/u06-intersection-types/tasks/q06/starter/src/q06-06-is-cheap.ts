// 問6 price が limit 以下なら true
//     例: isCheap({ name: "りんご", price: 150 }, 200) → true
// 引数と戻り値に型注釈を付ける。
// 引数の型には Named & Priced と書く。

export type Named = { name: string };

export type Priced = { price: number };

export function isCheap() {}
