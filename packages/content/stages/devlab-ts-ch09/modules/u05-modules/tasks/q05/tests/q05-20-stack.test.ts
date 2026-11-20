// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { Stack } from "../src/q05-20-stack";
test("問20 Stack", () => {
  const stack = new Stack();
  stack.push(1);
  stack.push(2);
  expect(stack.pop()).toBe(2);
  expect(stack.size).toBe(1);
});
