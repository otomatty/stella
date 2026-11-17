// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { getName } from "../src/q01-01-get-name";
test("問1 getName", () => {
  expect(getName({ name: "山田", age: 30 })).toBe("山田");
  expectTypeOf(getName).parameters.toEqualTypeOf<[{ name: string; age: number }]>();
  expectTypeOf(getName).returns.toEqualTypeOf<string>();
});
