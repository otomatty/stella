// 問15 ids のユーザーと投稿を同時に取得し、投稿がいちばん多い人の名前を返す。ユーザーか投稿の取得に失敗した人は除く。だれもいなければ undefined
//     例: mostActive([2, 1, 4]) → "山田" で解決する
// async と await を使ってください。
// ユーザーと投稿の取得には定義済みの getUser と getPosts を使ってください。
// ユーザーと投稿の取得の成否は Promise.all と Promise.allSettled を使って分けてください。

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

export function mostActive() {}
