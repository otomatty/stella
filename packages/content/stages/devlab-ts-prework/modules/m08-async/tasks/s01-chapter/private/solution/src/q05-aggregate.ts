import { timeout } from "./q01-promise";
import { tryAsync, withRetry } from "./q04-async-errors";

export type User = { id: number; name: string };
export type Post = { id: number; userId: number; title: string };
export type Api = {
  getUser: (id: number) => Promise<User>;
  getPosts: (userId: number) => Promise<Post[]>;
};
export type DashboardRow = { name: string; postCount: number | null };

export async function loadProfile(
  api: Api,
  userId: number,
): Promise<{ user: User; posts: Post[] }> {
  const [user, posts] = await timeout(
    Promise.all([api.getUser(userId), api.getPosts(userId)]),
    1000,
  );
  return { user, posts };
}

export async function loadUsers(
  api: Api,
  ids: readonly number[],
): Promise<{ users: User[]; failedIds: number[] }> {
  const results = await Promise.all(ids.map((id) => tryAsync(() => api.getUser(id))));
  const users: User[] = [];
  const failedIds: number[] = [];
  results.forEach((result, i) => {
    if (result.ok) {
      users.push(result.value);
    } else {
      failedIds.push(ids[i] ?? 0);
    }
  });
  return { users, failedIds };
}

export async function loadDashboard(api: Api, ids: readonly number[]): Promise<DashboardRow[]> {
  const [userResults, postResults] = await Promise.all([
    Promise.all(ids.map((id) => tryAsync(() => api.getUser(id)))),
    Promise.all(ids.map((id) => tryAsync(() => withRetry(() => api.getPosts(id), 2)))),
  ]);
  const rows: DashboardRow[] = [];
  userResults.forEach((userResult, i) => {
    if (!userResult.ok) {
      return;
    }
    const postResult = postResults[i];
    rows.push({
      name: userResult.value.name,
      postCount: postResult?.ok === true ? postResult.value.length : null,
    });
  });
  return rows;
}

export function formatDashboard(rows: readonly DashboardRow[]): string {
  if (rows.length === 0) {
    return "表示できるユーザーがいません";
  }
  return rows
    .map((row) =>
      row.postCount === null
        ? `${row.name}: 投稿数を取得できませんでした`
        : `${row.name}: 投稿 ${row.postCount}件`,
    )
    .join("\n");
}
