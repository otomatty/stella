// 問1 「山田（30）」を返す
//     例: introduce({ name: "山田", age: 30 }) → "山田（30）"
// 引数と戻り値に型注釈を付ける。
// 引数の型には Named & Aged と書く。

export type Named = { name: string };

export type Aged = { age: number };

export function introduce(person: Named & Aged): string {
  return `${person.name}（${person.age}）`;
}
