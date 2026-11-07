// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { introduce, type Named, type Aged } from "../src/q06-01-introduce";
test("問1 introduce", () => {
  expect(introduce({ name: "山田", age: 30 })).toBe("山田（30）");
  expectTypeOf(introduce).parameters.toEqualTypeOf<[Named & Aged]>();
  expectTypeOf(introduce).returns.toEqualTypeOf<string>();
});
