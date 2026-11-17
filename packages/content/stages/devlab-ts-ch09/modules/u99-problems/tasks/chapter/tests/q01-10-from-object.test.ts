// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { fromObject } from "../src/q01-10-from-object";
test("問10 fromObject", () => {
  const map = fromObject({ 山田: 80, 佐藤: 65 });
  expect(map.get("山田")).toBe(80);
  expect([...map.keys()]).toEqual(["山田", "佐藤"]);
  expectTypeOf(fromObject).parameters.toEqualTypeOf<[Record<string, number>]>();
  expectTypeOf(fromObject).returns.toEqualTypeOf<Map<string, number>>();
});
