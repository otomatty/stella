// 問11 name、age、id から Named & Aged & Identified を作る
//     例: makeMember("山田", 30, 1) → { name: "山田", age: 30, id: 1 }
// 引数と戻り値に型注釈を付ける。
// 戻り値の型には Named & Aged & Identified と書く。

export type Named = { name: string };

export type Aged = { age: number };

export type Identified = { id: number };

export function makeMember() {}
