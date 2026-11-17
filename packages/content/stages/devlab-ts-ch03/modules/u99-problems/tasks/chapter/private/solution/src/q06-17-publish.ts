// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

// 問17
export type Draft = { title: string };
export type Published = Draft & { publishedAt: Date };

export function publish(draft: Draft, at: Date): Published {
  return { ...draft, publishedAt: at };
}
