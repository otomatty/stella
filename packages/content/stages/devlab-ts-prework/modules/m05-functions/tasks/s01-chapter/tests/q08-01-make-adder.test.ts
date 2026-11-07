// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeAdder } from "../src/q08-01-make-adder";
test("問1 makeAdder", () => {
  const add3 = makeAdder(3);
  expect(add3(4)).toBe(7);
  expect(add3(10)).toBe(13);
  expectTypeOf(makeAdder).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(makeAdder).returns.toEqualTypeOf<(x: number) => number>();
});
