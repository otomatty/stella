// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Timestamped = { createdAt: Date };

export type Identified = { id: number };

// 問10
export function createdDate(x: Identified & Timestamped): string {
  return x.createdAt.toISOString().slice(0, 10);
}
