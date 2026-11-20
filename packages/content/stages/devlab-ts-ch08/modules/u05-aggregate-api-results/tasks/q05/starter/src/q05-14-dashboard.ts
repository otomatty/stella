// 08-q05 複数のAPIの結果をまとめる ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/promise
//       https://typescriptbook.jp/reference/asynchronous/await
//
// async・await と Promise.all・Promise.allSettled を使って書いてください。
// 型 User・Post・Comment と、APIの代わりの関数 getUser・getPosts・getComments は定義済みです。
// getUser(id) はいない id なら失敗し、getPosts(3) は必ず失敗します（投稿を取得できない人の例）。
// 待つ必要のない取得は、一度に始めて同時に待つこと。「順番に」と書いてある問題だけ、1つずつ待つ。

export type User = { id: number; name: string };

export type Post = { id: number; userId: number; title: string };

const USERS: User[] = [
  { id: 1, name: "山田" },
  { id: 2, name: "佐藤" },
  { id: 3, name: "鈴木" },
  { id: 4, name: "田中" },
];

const POSTS: Post[] = [
  { id: 10, userId: 1, title: "TypeScript を始めました" },
  { id: 11, userId: 1, title: "型注釈のこつ" },
  { id: 12, userId: 2, title: "非同期処理のまとめ" },
  { id: 13, userId: 1, title: "ジェネリクスに挑戦" },
];

// id のユーザーを取得する。いなければ失敗する
export function getUser(id: number): Promise<User> {
  const user = USERS.find((u) => u.id === id);
  return user === undefined
    ? Promise.reject(new Error(`ユーザー ${id} はいません`))
    : Promise.resolve(user);
}

// ユーザーの投稿を取得する。userId が 3 なら失敗する
export function getPosts(userId: number): Promise<Post[]> {
  return userId === 3
    ? Promise.reject(new Error("投稿を取得できません"))
    : Promise.resolve(POSTS.filter((p) => p.userId === userId));
}

// 問14 ids のユーザーと投稿をすべて同時に取得し、ユーザーを取得できた人だけ { name, postCount } の配列にする（ids の順）。投稿の取得に失敗した人の postCount は null
//     例: dashboard([1, 3, 9, 4]) → [{ name: "山田", postCount: 3 }, { name: "鈴木", postCount: null }, { name: "田中", postCount: 0 }]
export function dashboard() {}
