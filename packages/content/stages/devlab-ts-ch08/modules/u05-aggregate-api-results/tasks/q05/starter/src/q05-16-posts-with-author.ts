// 問16 ids のユーザーと投稿を同時に取得し、すべての投稿を { title, author: 書いた人の名前 } の配列にする（ids の順、その中は投稿の順）。失敗したらその失敗を投げる
//     例: postsWithAuthor([2]) → [{ title: "非同期処理のまとめ", author: "佐藤" }] で解決する
// async と await を使ってください。
// ユーザーと投稿の取得には定義済みの getUser と getPosts を使ってください。
// 同時に始めた取得は Promise.all で待ってください。

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

export function postsWithAuthor() {}
