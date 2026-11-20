// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { errorToJson, NotFoundError } from "../src/q04-20-error-to-json";
test("問20 errorToJson", () => {
  expect(errorToJson(new NotFoundError("ユーザー"))).toEqual({
    name: "NotFoundError",
    message: "ユーザー が見つかりません",
  });
  expect(errorToJson(new TypeError("型"))).toEqual({ name: "TypeError", message: "型" });
  expect(errorToJson(42)).toEqual({ name: "Unknown", message: "42" });
  expectTypeOf(errorToJson).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(errorToJson).returns.toEqualTypeOf<{ name: string; message: string }>();
});
