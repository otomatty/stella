// 問5 ids のユーザーの投稿を同時に取得し、投稿の数の合計を返す
//     例: totalPosts([1, 2]) → 4 で解決する
// async と await を使ってください。
// 投稿の取得には定義済みの getPosts を使ってください。
// 同時に始めた取得は Promise.all で待ってください。

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

export function totalPosts() {}
