import { afterEach, beforeEach, describe, expect, expectTypeOf, test, vi } from "vitest";
import {
  type NewPost,
  type User,
  API_URL,
  createPost,
  getJson,
  getUser,
  isUser,
  searchUsers,
} from "../src/q03-fetch";

// 本物の通信をしないように、fetch を差し替える
const fetchMock = vi.fn<typeof fetch>();
const respond = (body: unknown, status = 200) => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getJson", () => {
  test("ok なら JSON を返す", async () => {
    respond({ a: 1 });
    await expect(getJson(`${API_URL}/a`)).resolves.toEqual({ a: 1 });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/a`);
  });

  test("ok でなければ Error", async () => {
    respond({}, 404);
    await expect(getJson(`${API_URL}/a`)).rejects.toThrow("HTTP 404");
    respond({}, 500);
    await expect(getJson(`${API_URL}/a`)).rejects.toThrow("HTTP 500");
  });

  test("型", () => {
    expectTypeOf(getJson).returns.toEqualTypeOf<Promise<unknown>>();
  });
});

describe("isUser", () => {
  test("User の形か", () => {
    expect(isUser({ id: 1, name: "山田" })).toBe(true);
    expect(isUser({ id: "1", name: "山田" })).toBe(false);
    expect(isUser({ id: 1 })).toBe(false);
    expect(isUser(null)).toBe(false);
    expect(isUser("山田")).toBe(false);
  });

  test("型ガード関数", () => {
    expectTypeOf(isUser).guards.toEqualTypeOf<User>();
  });
});

describe("getUser", () => {
  test("ユーザーを返す", async () => {
    respond({ id: 1, name: "山田" });
    await expect(getUser(1)).resolves.toEqual({ id: 1, name: "山田" });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/users/1`);
  });

  test("形が違えば Error", async () => {
    respond({ id: 1 });
    await expect(getUser(1)).rejects.toThrow("ユーザーの形が違います");
  });

  test("ok でなければ Error", async () => {
    respond({}, 404);
    await expect(getUser(1)).rejects.toThrow("HTTP 404");
  });

  test("型", () => {
    expectTypeOf(getUser).returns.toEqualTypeOf<Promise<User>>();
  });
});

describe("searchUsers", () => {
  test("キーワードを変換して検索する", async () => {
    respond([{ id: 1, name: "山田" }]);
    await expect(searchUsers("山田 太郎")).resolves.toEqual([{ id: 1, name: "山田" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/users?q=%E5%B1%B1%E7%94%B0%20%E5%A4%AA%E9%83%8E`,
    );
  });

  test("形が違えば Error", async () => {
    respond({ id: 1, name: "山田" });
    await expect(searchUsers("a")).rejects.toThrow("ユーザーの形が違います");
    respond([{ id: 1, name: "山田" }, { id: 2 }]);
    await expect(searchUsers("a")).rejects.toThrow("ユーザーの形が違います");
  });

  test("型", () => {
    expectTypeOf(searchUsers).returns.toEqualTypeOf<Promise<User[]>>();
  });
});

describe("createPost", () => {
  const post: NewPost = { userId: 1, title: "はじめての投稿" };

  test("POST して id を返す", async () => {
    respond({ id: 10, userId: 1, title: "はじめての投稿" }, 201);
    await expect(createPost(post)).resolves.toBe(10);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
  });

  test("ok でなければ Error", async () => {
    respond({ message: "title がありません" }, 400);
    await expect(createPost(post)).rejects.toThrow("HTTP 400");
  });

  test("id がなければ Error", async () => {
    respond({ ok: true });
    await expect(createPost(post)).rejects.toThrow("投稿の形が違います");
  });

  test("型", () => {
    expectTypeOf(createPost).parameters.toEqualTypeOf<[NewPost]>();
    expectTypeOf(createPost).returns.toEqualTypeOf<Promise<number>>();
  });
});
