// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Named = { name: string };

export type Timestamped = { createdAt: Date };

// 問4
export function stamp(x: Named, createdAt: Date): Named & Timestamped {
  return { ...x, createdAt };
}
