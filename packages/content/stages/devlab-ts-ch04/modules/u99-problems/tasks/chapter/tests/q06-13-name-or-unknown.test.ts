// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nameOrUnknown } from "../src/q06-13-name-or-unknown";
test("問13 nameOrUnknown", () => {
  expect(nameOrUnknown({ name: "山田", age: 30 })).toBe("山田");
  expect(nameOrUnknown({})).toBe("不明");
  expect(nameOrUnknown(undefined)).toBe("不明");
  expectTypeOf(nameOrUnknown).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(nameOrUnknown).returns.toEqualTypeOf<string>();
});
