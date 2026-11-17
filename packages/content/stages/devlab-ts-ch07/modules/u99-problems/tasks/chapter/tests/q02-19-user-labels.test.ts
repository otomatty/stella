// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { USER_LABELS, type UserLabels } from "../src/q02-19-user-labels";
test("問19 UserLabels", () => {
  expectTypeOf<UserLabels>().toEqualTypeOf<{
    id: string;
    name: string;
    email: string;
    age: string;
  }>();
  expect(USER_LABELS.email).toBe("メール");
});
