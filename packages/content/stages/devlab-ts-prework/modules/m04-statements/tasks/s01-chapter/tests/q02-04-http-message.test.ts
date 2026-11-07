// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { httpMessage } from "../src/q02-04-http-message";
test("問4 httpMessage", () => {
  expect(httpMessage(200)).toBe("OK");
  expect(httpMessage(201)).toBe("Created");
  expect(httpMessage(404)).toBe("Not Found");
  expect(httpMessage(500)).toBe("Internal Server Error");
  expect(httpMessage(418)).toBe("Unknown");
  expectTypeOf(httpMessage).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(httpMessage).returns.toEqualTypeOf<string>();
});
