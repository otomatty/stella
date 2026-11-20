// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { oldestName, type Named, type Aged } from "../src/q06-13-oldest-name";
test("問13 oldestName", () => {
  expect(
    oldestName([
      { name: "山田", age: 30 },
      { name: "佐藤", age: 45 },
    ]),
  ).toBe("佐藤");
  expect(() => oldestName([])).toThrow(Error);
  expectTypeOf(oldestName).parameters.toEqualTypeOf<[readonly (Named & Aged)[]]>();
  expectTypeOf(oldestName).returns.toEqualTypeOf<string>();
});
