// 問12 price の合計を返す。引数は readonly (Named & Priced)[]
//     例: totalOf([りんご 150円, みかん 80円]) → 230
// 引数と戻り値に型注釈を付ける。

export type Named = { name: string };

export type Priced = { price: number };

export function totalOf() {}
