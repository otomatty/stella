// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toggle } from "../src/q07-01-toggle";
test("問1 toggle", () => {
  expect(toggle("on")).toBe("off");
  expect(toggle("off")).toBe("on");
  expectTypeOf(toggle).parameters.toEqualTypeOf<["on" | "off"]>();
  expectTypeOf(toggle).returns.toEqualTypeOf<"on" | "off">();
});
