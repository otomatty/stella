// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { completeTodo } from "../src/q02-08-complete-todo";
test("問8 completeTodo", () => {
  const todo = { id: 1, title: "買い物", done: false };
  expect(completeTodo(todo)).toEqual({ id: 1, title: "買い物", done: true });
  expect(todo.done).toBe(false);
  expectTypeOf(completeTodo).parameters.toEqualTypeOf<
    [{ readonly id: number; title: string; done: boolean }]
  >();
  expectTypeOf(completeTodo).returns.toEqualTypeOf<{
    readonly id: number;
    title: string;
    done: boolean;
  }>();
});
