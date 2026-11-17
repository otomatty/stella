// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Named = { name: string };

export type Aged = { age: number };

// 問2
export function makePerson(name: string, age: number): Named & Aged {
  return { name, age };
}
