// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nextSignal, type Signal } from "../src/q07-03-next-signal";
test("問3 nextSignal", () => {
  expect(nextSignal("green")).toBe("yellow");
  expect(nextSignal("yellow")).toBe("red");
  expect(nextSignal("red")).toBe("green");
  expectTypeOf(nextSignal).parameters.toEqualTypeOf<[Signal]>();
  expectTypeOf(nextSignal).returns.toEqualTypeOf<Signal>();
});
