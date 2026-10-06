import { describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";

/** JSON を送る POST のリクエスト。 */
function postJson(body) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

describe("ToDo の API", () => {
  test("GET /api/todos は一覧を返す", async () => {
    const app = createApp([{ id: 1, title: "買い物", done: false }]);
    const res = await app.request("/api/todos");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1, title: "買い物", done: false }]);
  });

  test("POST /api/todos は追加した ToDo を 201 で返す", async () => {
    const app = createApp();
    const res = await app.request("/api/todos", postJson({ title: "掃除" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 1, title: "掃除", done: false });
  });

  test("title が空なら 400 を返し、追加しない", async () => {
    const app = createApp();
    const res = await app.request("/api/todos", postJson({ title: " " }));
    expect(res.status).toBe(400);
    expect(await (await app.request("/api/todos")).json()).toEqual([]);
  });
});
