// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set

// 問19
export function allTags(posts: { tags: string[] }[]): string[] {
  return [...new Set(posts.flatMap((post) => post.tags))];
}
