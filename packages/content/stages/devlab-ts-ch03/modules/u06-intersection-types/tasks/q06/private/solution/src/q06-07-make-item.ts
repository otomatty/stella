// 問7 name と price から Named & Priced を作る
//     例: makeItem("りんご", 150) → { name: "りんご", price: 150 }
// 引数と戻り値に型注釈を付ける。
// 戻り値の型には Named & Priced と書く。

export type Named = { name: string };

export type Priced = { price: number };

export function makeItem(name: string, price: number): Named & Priced {
  return { name, price };
}
