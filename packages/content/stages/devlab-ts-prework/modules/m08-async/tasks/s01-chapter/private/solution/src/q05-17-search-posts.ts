// 08-q05 複数のAPIの結果をまとめる ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/promise
//       https://typescriptbook.jp/reference/asynchronous/await

export type Post = { id: number; userId: number; title: string };

const POSTS: Post[] = [
  { id: 10, userId: 1, title: "TypeScript を始めました" },
  { id: 11, userId: 1, title: "型注釈のこつ" },
  { id: 12, userId: 2, title: "非同期処理のまとめ" },
  { id: 13, userId: 1, title: "ジェネリクスに挑戦" },
];

// ユーザーの投稿を取得する。userId が 3 なら失敗する
export function getPosts(userId: number): Promise<Post[]> {
  return userId === 3
    ? Promise.reject(new Error("投稿を取得できません"))
    : Promise.resolve(POSTS.filter((p) => p.userId === userId));
}

// 問17
export async function searchPosts(ids: readonly number[], keyword: string): Promise<string[]> {
  const results = await Promise.allSettled(ids.map((id) => getPosts(id)));
  return results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .map((p) => p.title)
    .filter((title) => title.includes(keyword));
}
