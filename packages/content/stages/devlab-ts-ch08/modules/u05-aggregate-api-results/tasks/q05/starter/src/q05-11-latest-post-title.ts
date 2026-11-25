// 問11 ユーザーの投稿のうち、id がいちばん大きいもののタイトルを返す。投稿がなければ undefined
//     例: latestPostTitle(1) → "ジェネリクスに挑戦" で解決する
// async と await を使ってください。
// 投稿の取得には定義済みの getPosts を使ってください。

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

export function latestPostTitle() {}
