// 08-q05 複数のAPIの結果をまとめる ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/promise
//       https://typescriptbook.jp/reference/asynchronous/await
//
// async・await と Promise.all・Promise.allSettled を使って書いてください。
// 型 User・Post・Comment と、APIの代わりの関数 getUser・getPosts・getComments は定義済みです。
// getUser(id) はいない id なら失敗し、getPosts(3) は必ず失敗します（投稿を取得できない人の例）。
// 待つ必要のない取得は、一度に始めて同時に待つこと。「順番に」と書いてある問題だけ、1つずつ待つ。

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

// 問5 ids のユーザーの投稿を同時に取得し、投稿の数の合計を返す
//     例: totalPosts([1, 2]) → 4 で解決する
export function totalPosts() {}
