// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Named = { name: string };

export type Aged = { age: number };

// 問9
export function olderByOne(person: Named & Aged): Named & Aged {
  return { ...person, age: person.age + 1 };
}
