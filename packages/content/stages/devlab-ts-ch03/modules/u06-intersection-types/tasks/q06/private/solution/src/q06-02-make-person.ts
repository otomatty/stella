// 問2 name と age から Named & Aged を作る
//     例: makePerson("山田", 30) → { name: "山田", age: 30 }
// 引数と戻り値に型注釈を付ける。
// 戻り値の型には Named & Aged と書く。

export type Named = { name: string };

export type Aged = { age: number };

export function makePerson(name: string, age: number): Named & Aged {
  return { name, age };
}
