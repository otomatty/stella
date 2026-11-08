// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Timestamped = { createdAt: Date };

export type Identified = { id: number };

// 問16
export type Post = Identified & Timestamped & { title: string };

export function postTitle(post: Post): string {
  return `#${post.id} ${post.title}`;
}
