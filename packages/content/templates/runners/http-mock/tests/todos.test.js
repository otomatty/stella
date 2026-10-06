import { http, HttpResponse } from "msw/http";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { fetchOpenTodos } from "../src/todos.js";

const API = "https://api.example.test";

// 本物のサーバーの代わりに応答を返す。用意していない URL への通信はエラーにする。
const server = setupServer(
  http.get(`${API}/todos`, () =>
    HttpResponse.json([
      { id: 1, title: "買い物", done: false },
      { id: 2, title: "掃除", done: true },
    ]),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("fetchOpenTodos", () => {
  test("終わっていない ToDo だけを返す", async () => {
    expect(await fetchOpenTodos(API)).toEqual([
      { id: 1, title: "買い物", done: false },
    ]);
  });

  test("サーバーがエラーを返したら、状態コードを含むエラーにする", async () => {
    server.use(
      http.get(`${API}/todos`, () => new HttpResponse(null, { status: 500 })),
    );
    await expect(fetchOpenTodos(API)).rejects.toThrow("500");
  });
});
