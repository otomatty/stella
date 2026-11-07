// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { pluckAll } from "../src/q07-04-pluck-all";
test("問4 pluckAll", () => {
  const users = [{ name: "山田", age: 30 }];
  expect(pluckAll(users, "name")).toEqual(["山田"]);
  expectTypeOf(pluckAll(users, "age")).toEqualTypeOf<number[]>();
});
