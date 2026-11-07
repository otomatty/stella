// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { frozenPoint } from "../src/q02-14-frozen-point";
test("問14 frozenPoint", () => {
  const point = frozenPoint(1, 2);
  expect(point).toEqual({ x: 1, y: 2 });
  // @ts-expect-error x は読み取り専用なので代入できない
  point.x = 5;
  expectTypeOf(frozenPoint).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(frozenPoint).returns.toEqualTypeOf<{ readonly x: number; readonly y: number }>();
});
