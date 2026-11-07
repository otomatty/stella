// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Named = { name: string };

export type Identified = { id: number };

// 問3
export function withId(x: Named, id: number): Named & Identified {
  return { ...x, id };
}
