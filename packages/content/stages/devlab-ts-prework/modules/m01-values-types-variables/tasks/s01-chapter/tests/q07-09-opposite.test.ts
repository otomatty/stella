// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { opposite } from "../src/q07-09-opposite";
test("問9 opposite", () => {
  expect(opposite("north")).toBe("south");
  expect(opposite("east")).toBe("west");
  expect(opposite("west")).toBe("east");
  expectTypeOf(opposite).parameters.toEqualTypeOf<["north" | "south" | "east" | "west"]>();
  expectTypeOf(opposite).returns.toEqualTypeOf<"north" | "south" | "east" | "west">();
});
