import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { addTodo, completeTodo, listOpenTodos } from "../src/todos.js";
import { createTestDatabase } from "./database.js";

// 準備に時間がかかるので、空のデータベースを 1 回だけ作り、テストごとに複製して使う。
let empty;
let db;
beforeAll(async () => {
  empty = await createTestDatabase();
});
beforeEach(async () => {
  db = await empty.clone();
});
afterEach(async () => {
  await db.close();
});
afterAll(async () => {
  await empty.close();
});

describe("ToDo の表", () => {
  test("追加した ToDo に番号が付く", async () => {
    expect(await addTodo(db, "買い物")).toEqual({
      id: 1,
      title: "買い物",
      done: false,
    });
  });

  test("終わっていない ToDo だけを、追加した順に返す", async () => {
    const first = await addTodo(db, "買い物");
    await addTodo(db, "掃除");
    await completeTodo(db, first.id);
    expect(await listOpenTodos(db)).toEqual([
      { id: 2, title: "掃除", done: false },
    ]);
  });

  test("空の title は表の制約で止まる", async () => {
    await expect(addTodo(db, " ")).rejects.toThrow("check constraint");
  });
});
