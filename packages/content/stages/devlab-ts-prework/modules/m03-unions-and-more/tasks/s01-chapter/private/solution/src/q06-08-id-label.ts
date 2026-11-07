// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Named = { name: string };

export type Identified = { id: number };

// 問8
export function idLabel(x: Named & Identified): string {
  return `#${x.id} ${x.name}`;
}
