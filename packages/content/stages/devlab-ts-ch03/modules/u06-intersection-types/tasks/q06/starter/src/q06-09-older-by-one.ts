// 問9 age を1増やした、新しい Named & Aged を返す
//     例: olderByOne({ name: "山田", age: 30 }) → { name: "山田", age: 31 }
// 引数と戻り値に型注釈を付ける。
// 引数の型には Named & Aged と書く。

export type Named = { name: string };

export type Aged = { age: number };

export function olderByOne() {}
