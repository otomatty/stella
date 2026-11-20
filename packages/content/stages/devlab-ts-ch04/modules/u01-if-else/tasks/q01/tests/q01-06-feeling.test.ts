// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { feeling } from "../src/q01-06-feeling";
test("問6 feeling", () => {
  expect(feeling(14)).toBe("寒い");
  expect(feeling(20)).toBe("ちょうどよい");
  expect(feeling(28)).toBe("暑い");
  expectTypeOf(feeling).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(feeling).returns.toEqualTypeOf<"寒い" | "ちょうどよい" | "暑い">();
});
