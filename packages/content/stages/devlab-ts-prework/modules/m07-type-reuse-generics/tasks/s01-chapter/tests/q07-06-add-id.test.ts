// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { addId } from "../src/q07-06-add-id";
test("問6 addId", () => {
  expect(addId({ name: "山田" }, 1)).toEqual({ name: "山田", id: 1 });
  expectTypeOf(addId({ name: "山田" }, 1)).toEqualTypeOf<{ name: string } & { id: number }>();
});
