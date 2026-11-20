// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { errorMessage } from "../src/q04-02-error-message";
test("問2 errorMessage", () => {
  expect(errorMessage(new Error("x"))).toBe("x");
  expect(errorMessage(new TypeError("型"))).toBe("型");
  expect(errorMessage("x")).toBe("不明なエラー");
  expect(errorMessage(null)).toBe("不明なエラー");
  expectTypeOf(errorMessage).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(errorMessage).returns.toEqualTypeOf<string>();
});
