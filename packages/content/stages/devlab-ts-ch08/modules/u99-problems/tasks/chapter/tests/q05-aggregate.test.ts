import { afterEach, describe, expect, expectTypeOf, test, vi } from "vitest";
import {
  type Api,
  type DashboardRow,
  type Post,
  type User,
  formatDashboard,
  loadDashboard,
  loadProfile,
  loadUsers,
} from "../src/q05-aggregate";

afterEach(() => {
  vi.useRealTimers();
});

const users: User[] = [
  { id: 1, name: "山田" },
  { id: 2, name: "佐藤" },
  { id: 3, name: "鈴木" },
];
const posts: Post[] = [
  { id: 10, userId: 1, title: "はじめまして" },
  { id: 11, userId: 1, title: "2回目" },
  { id: 12, userId: 3, title: "こんにちは" },
];

// 呼ばれた順を log に残す api。brokenPosts の人の投稿の取得は失敗する
const createApi = (brokenPosts: number[] = []) => {
  const log: string[] = [];
  const api: Api = {
    getUser: async (id) => {
      log.push(`開始 user ${id}`);
      await Promise.resolve();
      const user = users.find((u) => u.id === id);
      log.push(`終了 user ${id}`);
      if (user === undefined) {
        throw new Error(`ユーザー ${id} はいません`);
      }
      return user;
    },
    getPosts: async (userId) => {
      log.push(`開始 posts ${userId}`);
      await Promise.resolve();
      log.push(`終了 posts ${userId}`);
      if (brokenPosts.includes(userId)) {
        throw new Error("投稿を取得できません");
      }
      return posts.filter((p) => p.userId === userId);
    },
  };
  return { log, api };
};

describe("loadProfile", () => {
  test("ユーザーと投稿を同時に取得する", async () => {
    const { log, api } = createApi();
    const profile = await loadProfile(api, 1);
    expect(profile.user.name).toBe("山田");
    expect(profile.posts.map((p) => p.id)).toEqual([10, 11]);
    expect(log.slice(0, 2).sort()).toEqual(["開始 posts 1", "開始 user 1"]);
  });

  test("失敗はそのまま投げる", async () => {
    await expect(loadProfile(createApi().api, 9)).rejects.toThrow("ユーザー 9 はいません");
    await expect(loadProfile(createApi([1]).api, 1)).rejects.toThrow("投稿を取得できません");
  });

  test("1000ミリ秒以内に終わらなければタイムアウト", async () => {
    vi.useFakeTimers();
    const { api } = createApi();
    const slow: Api = { ...api, getUser: () => new Promise<User>(() => undefined) };
    const check = expect(loadProfile(slow, 1)).rejects.toThrow("タイムアウトしました");
    await vi.advanceTimersByTimeAsync(1000);
    await check;
  });

  test("型", () => {
    expectTypeOf(loadProfile).returns.toEqualTypeOf<Promise<{ user: User; posts: Post[] }>>();
  });
});

describe("loadUsers", () => {
  test("同時に取得し、失敗した id を分ける", async () => {
    const { log, api } = createApi();
    const result = await loadUsers(api, [3, 9, 1, 8]);
    expect(result.users.map((u) => u.name)).toEqual(["鈴木", "山田"]);
    expect(result.failedIds).toEqual([9, 8]);
    expect(log.slice(0, 4)).toEqual(["開始 user 3", "開始 user 9", "開始 user 1", "開始 user 8"]);
  });

  test("型", () => {
    expectTypeOf(loadUsers).returns.toEqualTypeOf<
      Promise<{ users: User[]; failedIds: number[] }>
    >();
  });
});

describe("loadDashboard", () => {
  test("取得できた人だけを、投稿の数と一緒に並べる", async () => {
    const { log, api } = createApi([2]);
    const rows = await loadDashboard(api, [1, 2, 9, 3]);
    expect(rows).toEqual([
      { name: "山田", postCount: 2 },
      { name: "佐藤", postCount: null },
      { name: "鈴木", postCount: 1 },
    ]);
    const firstEnd = log.findIndex((line) => line.startsWith("終了"));
    expect(log.slice(0, firstEnd).filter((line) => line.startsWith("開始"))).toHaveLength(8);
  });

  test("投稿の取得は、失敗したら1回だけやり直す", async () => {
    const { api } = createApi();
    let calls = 0;
    const flaky: Api = {
      ...api,
      getPosts: async (userId) => {
        calls += 1;
        await Promise.resolve();
        if (calls === 1) {
          throw new Error("一時的に取得できません");
        }
        return await api.getPosts(userId);
      },
    };
    await expect(loadDashboard(flaky, [1])).resolves.toEqual([{ name: "山田", postCount: 2 }]);
    expect(calls).toBe(2);
  });

  test("型", () => {
    expectTypeOf(loadDashboard).returns.toEqualTypeOf<Promise<DashboardRow[]>>();
  });
});

describe("formatDashboard", () => {
  test("1人1行", () => {
    expect(
      formatDashboard([
        { name: "山田", postCount: 3 },
        { name: "佐藤", postCount: null },
      ]),
    ).toBe("山田: 投稿 3件\n佐藤: 投稿数を取得できませんでした");
    expect(formatDashboard([])).toBe("表示できるユーザーがいません");
  });

  test("loadDashboard と組み合わせる", async () => {
    const rows = await loadDashboard(createApi([3]).api, [3, 1]);
    expect(formatDashboard(rows)).toBe("鈴木: 投稿数を取得できませんでした\n山田: 投稿 2件");
  });
});
