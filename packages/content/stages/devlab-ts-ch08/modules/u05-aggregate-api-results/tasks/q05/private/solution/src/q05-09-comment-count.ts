// 問9 投稿のコメントの数を返す
//     例: commentCount(10) → 2 で解決する
// async と await を使ってください。
// コメントの取得には定義済みの getComments を使ってください。

export type Comment = { postId: number; text: string };

const COMMENTS: Comment[] = [
  { postId: 10, text: "いいですね" },
  { postId: 10, text: "参考になりました" },
  { postId: 12, text: "わかりやすい" },
  { postId: 13, text: "難しそう" },
];

// 投稿のコメントを取得する
export function getComments(postId: number): Promise<Comment[]> {
  return Promise.resolve(COMMENTS.filter((c) => c.postId === postId));
}

export async function commentCount(postId: number): Promise<number> {
  const comments = await getComments(postId);
  return comments.length;
}
