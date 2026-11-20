// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { turnLeft } from "../src/q02-07-turn-left";
test("問7 turnLeft", () => {
  expect(turnLeft("N")).toBe("W");
  expect(turnLeft("W")).toBe("S");
  expect(turnLeft("S")).toBe("E");
  expect(turnLeft("E")).toBe("N");
  expectTypeOf(turnLeft).parameters.toEqualTypeOf<["N" | "E" | "S" | "W"]>();
  expectTypeOf(turnLeft).returns.toEqualTypeOf<"N" | "E" | "S" | "W">();
});
