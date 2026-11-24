// 問18 ユーザーの投稿を取得してから、それぞれの投稿のコメントを同時に取得し、コメントの数の合計を返す
//     例: commentTotal(1) → 3 で解決する
// async と await を使ってください。
// コメントの取得には定義済みの getComments を使ってください。
// 投稿の取得には定義済みの getPosts を使ってください。
// 同時に始めた取得は Promise.all で待ってください。

export type Post = { id: number; userId: number; title: string };

export type Comment = { postId: number; text: string };

const POSTS: Post[] = [
  { id: 10, userId: 1, title: "TypeScript を始めました" },
  { id: 11, userId: 1, title: "型注釈のこつ" },
  { id: 12, userId: 2, title: "非同期処理のまとめ" },
  { id: 13, userId: 1, title: "ジェネリクスに挑戦" },
];

const COMMENTS: Comment[] = [
  { postId: 10, text: "いいですね" },
  { postId: 10, text: "参考になりました" },
  { postId: 12, text: "わかりやすい" },
  { postId: 13, text: "難しそう" },
];

// ユーザーの投稿を取得する。userId が 3 なら失敗する
export function getPosts(userId: number): Promise<Post[]> {
  return userId === 3
    ? Promise.reject(new Error("投稿を取得できません"))
    : Promise.resolve(POSTS.filter((p) => p.userId === userId));
}

// 投稿のコメントを取得する
export function getComments(postId: number): Promise<Comment[]> {
  return Promise.resolve(COMMENTS.filter((c) => c.postId === postId));
}

export async function commentTotal(userId: number): Promise<number> {
  const posts = await getPosts(userId);
  const lists = await Promise.all(posts.map((p) => getComments(p.id)));
  return lists.reduce((sum, comments) => sum + comments.length, 0);
}
