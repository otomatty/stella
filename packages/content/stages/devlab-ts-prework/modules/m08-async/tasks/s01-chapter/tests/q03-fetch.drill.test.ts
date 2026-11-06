// このファイルは書き換えないでください
import { afterEach, beforeEach, vi, expect, expectTypeOf, test } from "vitest";
import {
  getStatus,
  API,
  type User,
  type Todo,
  isOk,
  getText,
  getJson,
  getJsonOrThrow,
  getUser,
  getUserOrNull,
  getUsers,
  getTodoTitles,
  countDone,
  searchUsers,
  getTodosPage,
  postJson,
  createTodo,
  updateTodo,
  deleteTodo,
  getWithToken,
  getAllTexts,
  getFirstOk,
  getJsonSafe,
} from "../src/q03-fetch.drill";

// 本物の通信をしないように、fetch を差し替える
const fetchMock = vi.fn<typeof fetch>();
const respond = (body: unknown, status = 200) => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
};
const respondText = (text: string, status = 200) => {
  fetchMock.mockResolvedValueOnce(new Response(text, { status }));
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("問1 getStatus", async () => {
  respond({}, 404);
  await expect(getStatus(`${API}/a`)).resolves.toBe(404);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/a`);
  expectTypeOf(getStatus).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(getStatus).returns.toEqualTypeOf<Promise<number>>();
});

test("問2 isOk", async () => {
  respond({});
  await expect(isOk(`${API}/a`)).resolves.toBe(true);
  respond({}, 500);
  await expect(isOk(`${API}/a`)).resolves.toBe(false);
  expectTypeOf(isOk).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isOk).returns.toEqualTypeOf<Promise<boolean>>();
});

test("問3 getText", async () => {
  respondText("こんにちは");
  await expect(getText(`${API}/hello`)).resolves.toBe("こんにちは");
  expect(fetchMock).toHaveBeenCalledWith(`${API}/hello`);
  expectTypeOf(getText).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(getText).returns.toEqualTypeOf<Promise<string>>();
});

test("問4 getJson", async () => {
  respond({ a: 1 });
  await expect(getJson(`${API}/a`)).resolves.toEqual({ a: 1 });
  expectTypeOf(getJson).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(getJson).returns.toEqualTypeOf<Promise<unknown>>();
});

test("問5 getJsonOrThrow", async () => {
  respond({ a: 1 });
  await expect(getJsonOrThrow(`${API}/a`)).resolves.toEqual({ a: 1 });
  respond({}, 404);
  await expect(getJsonOrThrow(`${API}/a`)).rejects.toThrow("HTTP 404");
  expectTypeOf(getJsonOrThrow).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(getJsonOrThrow).returns.toEqualTypeOf<Promise<unknown>>();
});

test("問6 getUser", async () => {
  respond({ id: 1, name: "山田" });
  await expect(getUser(1)).resolves.toEqual({ id: 1, name: "山田" });
  expect(fetchMock).toHaveBeenCalledWith(`${API}/users/1`);
  respond({ id: 1 });
  await expect(getUser(1)).rejects.toThrow("ユーザーの形が違います");
  respond({}, 404);
  await expect(getUser(1)).rejects.toThrow("HTTP 404");
  expectTypeOf(getUser).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(getUser).returns.toEqualTypeOf<Promise<User>>();
});

test("問7 getUserOrNull", async () => {
  respond({}, 404);
  await expect(getUserOrNull(9)).resolves.toBeNull();
  expect(fetchMock).toHaveBeenCalledWith(`${API}/users/9`);
  respond({ id: 2, name: "佐藤" });
  await expect(getUserOrNull(2)).resolves.toEqual({ id: 2, name: "佐藤" });
  respond({}, 500);
  await expect(getUserOrNull(2)).rejects.toThrow("HTTP 500");
  expectTypeOf(getUserOrNull).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(getUserOrNull).returns.toEqualTypeOf<Promise<User | null>>();
});

test("問8 getUsers", async () => {
  respond([{ id: 1, name: "山田" }]);
  await expect(getUsers()).resolves.toEqual([{ id: 1, name: "山田" }]);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/users`);
  respond({ id: 1, name: "山田" });
  await expect(getUsers()).rejects.toThrow("ユーザーの形が違います");
  respond([{ id: 1, name: "山田" }, { id: 2 }]);
  await expect(getUsers()).rejects.toThrow("ユーザーの形が違います");
  expectTypeOf(getUsers).returns.toEqualTypeOf<Promise<User[]>>();
});

test("問9 getTodoTitles", async () => {
  respond([
    { id: 1, title: "買い物", done: false },
    { id: 2, title: "掃除", done: true },
  ]);
  await expect(getTodoTitles()).resolves.toEqual(["買い物", "掃除"]);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/todos`);
  respond([{ id: 1, title: "買い物" }]);
  await expect(getTodoTitles()).rejects.toThrow("TODO の形が違います");
  expectTypeOf(getTodoTitles).returns.toEqualTypeOf<Promise<string[]>>();
});

test("問10 countDone", async () => {
  respond([
    { id: 1, title: "買い物", done: false },
    { id: 2, title: "掃除", done: true },
  ]);
  await expect(countDone()).resolves.toBe(1);
  respond("todos");
  await expect(countDone()).rejects.toThrow("TODO の形が違います");
  expectTypeOf(countDone).returns.toEqualTypeOf<Promise<number>>();
});

test("問11 searchUsers", async () => {
  respond([{ id: 1, name: "山田" }]);
  await expect(searchUsers("山田 太郎")).resolves.toEqual([{ id: 1, name: "山田" }]);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/users?q=%E5%B1%B1%E7%94%B0%20%E5%A4%AA%E9%83%8E`);
  expectTypeOf(searchUsers).returns.toEqualTypeOf<Promise<User[]>>();
});

test("問12 getTodosPage", async () => {
  respond([{ id: 11, title: "a", done: false }]);
  await expect(getTodosPage(2, 10)).resolves.toEqual([{ id: 11, title: "a", done: false }]);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/todos?page=2&per_page=10`);
  expectTypeOf(getTodosPage).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(getTodosPage).returns.toEqualTypeOf<Promise<Todo[]>>();
});

test("問13 postJson", async () => {
  respond({}, 201);
  await expect(postJson(`${API}/logs`, { level: "info" })).resolves.toBe(201);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"level":"info"}',
  });
  expectTypeOf(postJson).parameters.toEqualTypeOf<[string, unknown]>();
  expectTypeOf(postJson).returns.toEqualTypeOf<Promise<number>>();
});

test("問14 createTodo", async () => {
  respond({ id: 5, title: "買い物", done: false }, 201);
  await expect(createTodo("買い物")).resolves.toEqual({ id: 5, title: "買い物", done: false });
  expect(fetchMock).toHaveBeenCalledWith(`${API}/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"title":"買い物","done":false}',
  });
  respond({ message: "title が空です" }, 400);
  await expect(createTodo("")).rejects.toThrow("HTTP 400");
  respond({ id: 5 }, 201);
  await expect(createTodo("a")).rejects.toThrow("TODO の形が違います");
  expectTypeOf(createTodo).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(createTodo).returns.toEqualTypeOf<Promise<Todo>>();
});

test("問15 updateTodo", async () => {
  respond({});
  await expect(updateTodo(3, true)).resolves.toBe(true);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/todos/3`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: '{"done":true}',
  });
  expectTypeOf(updateTodo).parameters.toEqualTypeOf<[number, boolean]>();
  expectTypeOf(updateTodo).returns.toEqualTypeOf<Promise<boolean>>();
});

test("問16 deleteTodo", async () => {
  respond({});
  await expect(deleteTodo(3)).resolves.toBe(true);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/todos/3`, { method: "DELETE" });
  respond({}, 404);
  await expect(deleteTodo(9)).resolves.toBe(false);
  expectTypeOf(deleteTodo).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(deleteTodo).returns.toEqualTypeOf<Promise<boolean>>();
});

test("問17 getWithToken", async () => {
  respondText("ひみつ");
  await expect(getWithToken(`${API}/me`, "abc")).resolves.toBe("ひみつ");
  expect(fetchMock).toHaveBeenCalledWith(`${API}/me`, { headers: { Authorization: "Bearer abc" } });
  expectTypeOf(getWithToken).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(getWithToken).returns.toEqualTypeOf<Promise<string>>();
});

test("問18 getAllTexts", async () => {
  respondText("a");
  respondText("b");
  await expect(getAllTexts([`${API}/a`, `${API}/b`])).resolves.toEqual(["a", "b"]);
  expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([`${API}/a`, `${API}/b`]);
  expectTypeOf(getAllTexts).returns.toEqualTypeOf<Promise<string[]>>();
});

test("問19 getFirstOk", async () => {
  respondText("", 404);
  respondText("b");
  await expect(getFirstOk([`${API}/a`, `${API}/b`, `${API}/c`])).resolves.toBe("b");
  expect(fetchMock).toHaveBeenCalledTimes(2);
  respondText("", 500);
  await expect(getFirstOk([`${API}/a`])).rejects.toThrow("取得できませんでした");
  expectTypeOf(getFirstOk).returns.toEqualTypeOf<Promise<string>>();
});

test("問20 getJsonSafe", async () => {
  respond({ a: 1 });
  await expect(getJsonSafe(`${API}/a`)).resolves.toEqual({ a: 1 });
  fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await expect(getJsonSafe(`${API}/a`)).resolves.toBeUndefined();
  respond({}, 500);
  await expect(getJsonSafe(`${API}/a`)).resolves.toBeUndefined();
  respondText("JSON ではない");
  await expect(getJsonSafe(`${API}/a`)).resolves.toBeUndefined();
  expectTypeOf(getJsonSafe).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(getJsonSafe).returns.toEqualTypeOf<Promise<unknown>>();
});
