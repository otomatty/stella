// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { arrowOf, type Direction } from "../src/q02-04-arrow-of";
test("問4 arrowOf", () => {
  expect(arrowOf("up")).toBe("↑");
  expect(arrowOf("down")).toBe("↓");
  expect(arrowOf("left")).toBe("←");
  expect(arrowOf("right")).toBe("→");
  expectTypeOf(arrowOf).parameters.toEqualTypeOf<[Direction]>();
  expectTypeOf(arrowOf).returns.toEqualTypeOf<"↑" | "↓" | "←" | "→">();
});
