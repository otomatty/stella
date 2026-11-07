// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { actionText, type UserAction } from "../src/q04-14-action-text";
test("問14 actionText", () => {
  expectTypeOf<UserAction>().toEqualTypeOf<
    { kind: "click"; x: number; y: number } | { kind: "key"; key: string }
  >();
  expect(actionText({ kind: "click", x: 10, y: 20 })).toBe("click(10, 20)");
  expect(actionText({ kind: "key", key: "Enter" })).toBe("key(Enter)");
  expectTypeOf(actionText).parameters.toEqualTypeOf<[UserAction]>();
  expectTypeOf(actionText).returns.toEqualTypeOf<string>();
});
