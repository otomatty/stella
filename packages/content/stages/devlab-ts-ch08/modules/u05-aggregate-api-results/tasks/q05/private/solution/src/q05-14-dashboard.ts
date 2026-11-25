// 問14 ids のユーザーと投稿をすべて同時に取得し、ユーザーを取得できた人だけ { name, postCount } の配列にする（ids の順）。投稿の取得に失敗した人の postCount は null
//     例: dashboard([1, 3, 9, 4]) → [{ name: "山田", postCount: 3 }, { name: "鈴木", postCount: null }, { name: "田中", postCount: 0 }]
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

export async function dashboard(
  ids: readonly number[],
): Promise<{ name: string; postCount: number | null }[]> {
  const [userResults, postResults] = await Promise.all([
    Promise.allSettled(ids.map((id) => getUser(id))),
    Promise.allSettled(ids.map((id) => getPosts(id))),
  ]);
  return userResults.flatMap((userResult, i) => {
    if (userResult.status === "rejected") {
      return [];
    }
    const postResult = postResults[i];
    const postCount = postResult?.status === "fulfilled" ? postResult.value.length : null;
    return [{ name: userResult.value.name, postCount }];
  });
}
