// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { getProp } from "../src/q07-01-get-prop";
test("問1 getProp", () => {
  const user = { name: "山田", age: 30 };
  expect(getProp(user, "age")).toBe(30);
  expectTypeOf(getProp(user, "age")).toEqualTypeOf<number>();
  expectTypeOf(getProp(user, "name")).toEqualTypeOf<string>();
  const call = () => {
    // @ts-expect-error email は user のプロパティではない
    getProp(user, "email");
  };
  expect(typeof call).toBe("function");
});
