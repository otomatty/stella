// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeStack } from "../src/q08-12-make-stack";
test("問12 makeStack", () => {
  const stack = makeStack();
  stack.push(1);
  stack.push(2);
  expect(stack.size()).toBe(2);
  expect(stack.pop()).toBe(2);
  expect(stack.pop()).toBe(1);
  expect(stack.pop()).toBeUndefined();
  expectTypeOf(makeStack).parameters.toEqualTypeOf<[]>();
  expectTypeOf(makeStack).returns.toEqualTypeOf<{
    push: (n: number) => void;
    pop: () => number | undefined;
    size: () => number;
  }>();
});
