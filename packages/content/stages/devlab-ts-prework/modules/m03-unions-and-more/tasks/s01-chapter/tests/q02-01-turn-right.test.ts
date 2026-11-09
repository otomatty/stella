// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { turnRight, type Direction } from "../src/q02-01-turn-right";
test("問1 turnRight", () => {
  expect(turnRight("up")).toBe("right");
  expect(turnRight("right")).toBe("down");
  expect(turnRight("down")).toBe("left");
  expect(turnRight("left")).toBe("up");
  expectTypeOf(turnRight).parameters.toEqualTypeOf<[Direction]>();
  expectTypeOf(turnRight).returns.toEqualTypeOf<Direction>();
});
