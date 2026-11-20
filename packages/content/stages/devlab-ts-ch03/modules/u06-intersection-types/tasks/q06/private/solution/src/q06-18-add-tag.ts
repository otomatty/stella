// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Named = { name: string };

// 問18
export type Tagged = Named & { tags: string[] };

export function addTag(x: Tagged, tag: string): Tagged {
  return { ...x, tags: [...x.tags, tag] };
}
