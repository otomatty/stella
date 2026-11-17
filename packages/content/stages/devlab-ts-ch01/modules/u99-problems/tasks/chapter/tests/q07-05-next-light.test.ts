// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nextLight } from "../src/q07-05-next-light";
test("問5 nextLight", () => {
  expect(nextLight("green")).toBe("yellow");
  expect(nextLight("yellow")).toBe("red");
  expect(nextLight("red")).toBe("green");
  expectTypeOf(nextLight).parameters.toEqualTypeOf<["green" | "yellow" | "red"]>();
  expectTypeOf(nextLight).returns.toEqualTypeOf<"green" | "yellow" | "red">();
});
