// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { waterState } from "../src/q01-14-water-state";
test("問14 waterState", () => {
  expect(waterState(0)).toBe("氷");
  expect(waterState(50)).toBe("水");
  expect(waterState(100)).toBe("水蒸気");
  expectTypeOf(waterState).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(waterState).returns.toEqualTypeOf<"氷" | "水" | "水蒸気">();
});
