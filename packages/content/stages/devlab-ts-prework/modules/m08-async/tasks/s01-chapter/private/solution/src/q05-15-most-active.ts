// 08-q05 複数のAPIの結果をまとめる ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/promise
//       https://typescriptbook.jp/reference/asynchronous/await

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

// 問15
export async function mostActive(ids: readonly number[]): Promise<string | undefined> {
  const results = await Promise.allSettled(ids.map((id) => userWithPostsOf(id)));
  let best: { name: string; count: number } | undefined;
  for (const result of results) {
    if (result.status !== "fulfilled") {
      continue;
    }
    const { user, posts } = result.value;
    if (best === undefined || posts.length > best.count) {
      best = { name: user.name, count: posts.length };
    }
  }
  return best?.name;
}

async function userWithPostsOf(id: number): Promise<{ user: User; posts: Post[] }> {
  const [user, posts] = await Promise.all([getUser(id), getPosts(id)]);
  return { user, posts };
}
