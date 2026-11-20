// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Named = { name: string };

export type Aged = { age: number };

export type Identified = { id: number };

// 問11
export function makeMember(name: string, age: number, id: number): Named & Aged & Identified {
  return { name, age, id };
}
