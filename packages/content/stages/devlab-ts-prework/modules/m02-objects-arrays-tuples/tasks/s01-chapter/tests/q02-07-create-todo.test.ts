// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { createTodo } from "../src/q02-07-create-todo";
test("問7 createTodo", () => {
  const todo = createTodo(1, "買い物");
  expect(todo).toEqual({ id: 1, title: "買い物", done: false });
  // @ts-expect-error id は読み取り専用なので代入できない
  todo.id = 2;
  expectTypeOf(createTodo).parameters.toEqualTypeOf<[number, string]>();
  expectTypeOf(createTodo).returns.toEqualTypeOf<{
    readonly id: number;
    title: string;
    done: boolean;
  }>();
});
