// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { shapeName, type Shape } from "../src/q04-02-shape-name";
test("問2 shapeName", () => {
  expect(shapeName({ kind: "circle", radius: 1 })).toBe("円");
  expect(shapeName({ kind: "square", size: 1 })).toBe("正方形");
  expect(shapeName({ kind: "rect", width: 1, height: 2 })).toBe("長方形");
  expectTypeOf(shapeName).parameters.toEqualTypeOf<[Shape]>();
  expectTypeOf(shapeName).returns.toEqualTypeOf<"円" | "正方形" | "長方形">();
});
