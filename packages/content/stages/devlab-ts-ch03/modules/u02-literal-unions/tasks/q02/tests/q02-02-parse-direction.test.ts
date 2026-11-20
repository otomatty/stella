// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseDirection, type Direction } from "../src/q02-02-parse-direction";
test("問2 parseDirection", () => {
  expect(parseDirection(" UP ")).toBe("up");
  expect(parseDirection("left")).toBe("left");
  expect(parseDirection("forward")).toBeUndefined();
  expectTypeOf(parseDirection).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseDirection).returns.toEqualTypeOf<Direction | undefined>();
});
