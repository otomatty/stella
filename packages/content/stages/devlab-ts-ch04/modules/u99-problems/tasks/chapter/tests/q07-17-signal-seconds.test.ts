// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { signalSeconds, type Signal } from "../src/q07-17-signal-seconds";
test("問17 signalSeconds", () => {
  expect(signalSeconds("green")).toBe(30);
  expect(signalSeconds("yellow")).toBe(3);
  expect(signalSeconds("red")).toBe(27);
  expectTypeOf(signalSeconds).parameters.toEqualTypeOf<[Signal]>();
  expectTypeOf(signalSeconds).returns.toEqualTypeOf<number>();
});
