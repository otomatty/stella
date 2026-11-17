import { describe, expect, expectTypeOf, test } from "vitest";
import { type Filter, type Todo, TodoList } from "../src/q05-todo-list";

const sample = (): TodoList => {
  const list = new TodoList();
  list.add("買い物");
  list.add("掃除");
  list.add("洗濯");
  list.complete(2);
  return list;
};

describe("TodoList", () => {
  test("add は id を順に振る", () => {
    const list = new TodoList();
    expect(list.add(" 買い物 ")).toEqual({ id: 1, title: "買い物", done: false });
    expect(list.add("掃除")).toEqual({ id: 2, title: "掃除", done: false });
  });

  test("空のタイトルは Error", () => {
    expect(() => new TodoList().add("   ")).toThrow("タイトルを入力してください");
  });

  test("complete と絞り込み", () => {
    const list = sample();
    expect(list.list().map((t) => t.title)).toEqual(["買い物", "掃除", "洗濯"]);
    expect(list.list("active").map((t) => t.id)).toEqual([1, 3]);
    expect(list.list("done").map((t) => t.id)).toEqual([2]);
  });

  test("remove", () => {
    const list = sample();
    list.remove(1);
    expect(list.list().map((t) => t.id)).toEqual([2, 3]);
    expect(list.add("料理").id).toBe(4);
  });

  test("見つからなければ Error", () => {
    const list = sample();
    expect(() => {
      list.complete(99);
    }).toThrow("ToDo がありません: 99");
    expect(() => {
      list.remove(99);
    }).toThrow("ToDo がありません: 99");
  });

  test("count", () => {
    expect(sample().count()).toEqual({ all: 3, active: 2, done: 1 });
    expect(new TodoList().count()).toEqual({ all: 0, active: 0, done: 0 });
  });

  test("list はコピーを返す", () => {
    const list = sample();
    const copied = list.list();
    copied.pop();
    const first = copied[0];
    if (first !== undefined) {
      first.done = true;
    }
    expect(list.count()).toEqual({ all: 3, active: 2, done: 1 });
  });

  test("ToDo の配列は外から見えない", () => {
    // @ts-expect-error ToDo の配列は private
    expectTypeOf<TodoList>().toHaveProperty("todos");
  });

  test("型", () => {
    expectTypeOf<TodoList["add"]>().toEqualTypeOf<(title: string) => Todo>();
    expectTypeOf<TodoList["complete"]>().toEqualTypeOf<(id: number) => void>();
    expectTypeOf<TodoList["remove"]>().toEqualTypeOf<(id: number) => void>();
    expectTypeOf<TodoList["list"]>().toEqualTypeOf<(filter?: Filter) => Todo[]>();
    expectTypeOf<TodoList["count"]>().toEqualTypeOf<
      () => { all: number; active: number; done: number }
    >();
  });
});
