// 問3 Named に id を足した Named & Identified を返す
//     例: withId({ name: "山田" }, 3) → { name: "山田", id: 3 }
// 引数と戻り値に型注釈を付ける。
// 戻り値の型には Named & Identified と書く。

export type Named = { name: string };

export type Identified = { id: number };

export function withId() {}
