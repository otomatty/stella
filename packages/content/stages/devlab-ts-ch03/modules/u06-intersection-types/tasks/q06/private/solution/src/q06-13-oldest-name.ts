// 問13 いちばん年上の人の name を返す。同じ年齢なら先に出てきた人。空の配列なら Error を投げる
//     例: oldestName([山田 30, 佐藤 45]) → "佐藤"
// 引数と戻り値に型注釈を付ける。
// 引数の型には readonly (Named & Aged)[] と書く。

export type Named = { name: string };

export type Aged = { age: number };

export function oldestName(people: readonly (Named & Aged)[]): string {
  const [first, ...rest] = people;
  if (first === undefined) {
    throw new Error("空の配列です");
  }
  let oldest = first;
  for (const person of rest) {
    if (person.age > oldest.age) {
      oldest = person;
    }
  }
  return oldest.name;
}
