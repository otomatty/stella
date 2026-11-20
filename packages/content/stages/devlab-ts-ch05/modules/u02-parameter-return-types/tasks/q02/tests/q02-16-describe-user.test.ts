// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { describeUser } from "../src/q02-16-describe-user";
test("問16 describeUser", () => {
  expect(describeUser({ name: "山田", age: 30 })).toBe("山田（30歳）");
  expectTypeOf(describeUser).parameters.toEqualTypeOf<[{ name: string; age: number }]>();
  expectTypeOf(describeUser).returns.toEqualTypeOf<string>();
});
