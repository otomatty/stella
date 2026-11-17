// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Named = { name: string };

export type Aged = { age: number };

// 問13
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
