export type User = { id: number; name: string };
export type Post = { id: number; userId: number; title: string };
export type Comment = { postId: number; text: string };

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
const COMMENTS: Comment[] = [
  { postId: 10, text: "いいですね" },
  { postId: 10, text: "参考になりました" },
  { postId: 12, text: "わかりやすい" },
  { postId: 13, text: "難しそう" },
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

// 投稿のコメントを取得する
export function getComments(postId: number): Promise<Comment[]> {
  return Promise.resolve(COMMENTS.filter((c) => c.postId === postId));
}

// 問1
export async function userWithPosts(id: number): Promise<{ user: User; posts: Post[] }> {
  const [user, posts] = await Promise.all([getUser(id), getPosts(id)]);
  return { user, posts };
}

// 問2
export async function postCount(userId: number): Promise<number> {
  const posts = await getPosts(userId);
  return posts.length;
}

// 問3
export async function postTitles(userId: number): Promise<string[]> {
  const posts = await getPosts(userId);
  return posts.map((p) => p.title);
}

// 問4
export async function namesOf(ids: readonly number[]): Promise<string[]> {
  const users = await Promise.all(ids.map((id) => getUser(id)));
  return users.map((u) => u.name);
}

// 問5
export async function totalPosts(ids: readonly number[]): Promise<number> {
  const lists = await Promise.all(ids.map((id) => getPosts(id)));
  return lists.reduce((sum, posts) => sum + posts.length, 0);
}

// 問6
export async function loadedUsers(ids: readonly number[]): Promise<User[]> {
  const results = await Promise.allSettled(ids.map((id) => getUser(id)));
  return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}

// 問7
export async function missingIds(ids: readonly number[]): Promise<number[]> {
  const results = await Promise.allSettled(ids.map((id) => getUser(id)));
  return ids.filter((_, i) => results[i]?.status === "rejected");
}

// 問8
export async function userSummary(id: number): Promise<string> {
  const [user, posts] = await Promise.all([getUser(id), getPosts(id)]);
  return `${user.name}（投稿 ${posts.length}件）`;
}

// 問9
export async function commentCount(postId: number): Promise<number> {
  const comments = await getComments(postId);
  return comments.length;
}

// 問10
export async function commentsOfUser(userId: number): Promise<string[]> {
  const posts = await getPosts(userId);
  const lists = await Promise.all(posts.map((p) => getComments(p.id)));
  return lists.flat().map((c) => c.text);
}

// 問11
export async function latestPostTitle(userId: number): Promise<string | undefined> {
  const posts = await getPosts(userId);
  let latest: Post | undefined;
  for (const post of posts) {
    if (latest === undefined || post.id > latest.id) {
      latest = post;
    }
  }
  return latest?.title;
}

// 問12
export async function postCountsById(ids: readonly number[]): Promise<Record<number, number>> {
  const results = await Promise.allSettled(ids.map((id) => getPosts(id)));
  const counts: Record<number, number> = {};
  results.forEach((result, i) => {
    const id = ids[i];
    if (result.status === "fulfilled" && id !== undefined) {
      counts[id] = result.value.length;
    }
  });
  return counts;
}

// 問13
export async function profileOrNull(id: number): Promise<{ user: User; posts: Post[] } | null> {
  try {
    const [user, posts] = await Promise.all([getUser(id), getPosts(id)]);
    return { user, posts };
  } catch {
    return null;
  }
}

// 問14
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

// 問16
export async function postsWithAuthor(
  ids: readonly number[],
): Promise<{ title: string; author: string }[]> {
  const pairs = await Promise.all(ids.map((id) => Promise.all([getUser(id), getPosts(id)])));
  return pairs.flatMap(([user, posts]) =>
    posts.map((p) => ({ title: p.title, author: user.name })),
  );
}

// 問17
export async function searchPosts(ids: readonly number[], keyword: string): Promise<string[]> {
  const results = await Promise.allSettled(ids.map((id) => getPosts(id)));
  return results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .map((p) => p.title)
    .filter((title) => title.includes(keyword));
}

// 問18
export async function commentTotal(userId: number): Promise<number> {
  const posts = await getPosts(userId);
  const lists = await Promise.all(posts.map((p) => getComments(p.id)));
  return lists.reduce((sum, comments) => sum + comments.length, 0);
}

// 問19
export async function firstAvailableName(ids: readonly number[]): Promise<string | undefined> {
  for (const id of ids) {
    try {
      const user = await getUser(id);
      return user.name;
    } catch {
      // 次の id を試す
    }
  }
  return undefined;
}

// 問20
export async function loadInBatches(ids: readonly number[], size: number): Promise<string[]> {
  if (size < 1) {
    throw new Error("size は1以上にしてください");
  }
  const names: string[] = [];
  for (let i = 0; i < ids.length; i += size) {
    const users = await Promise.all(ids.slice(i, i + size).map((id) => getUser(id)));
    names.push(...users.map((u) => u.name));
  }
  return names;
}
