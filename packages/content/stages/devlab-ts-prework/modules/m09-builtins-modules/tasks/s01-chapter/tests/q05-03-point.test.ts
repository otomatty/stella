// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type Point } from "../src/q05-03-point";
test("問3 Point", () => {
  expectTypeOf<Point>().toEqualTypeOf<{ x: number; y: number }>();
});
