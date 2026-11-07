// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Named = { name: string };

export type Aged = { age: number };

// 問1
export function introduce(person: Named & Aged): string {
  return `${person.name}（${person.age}）`;
}
