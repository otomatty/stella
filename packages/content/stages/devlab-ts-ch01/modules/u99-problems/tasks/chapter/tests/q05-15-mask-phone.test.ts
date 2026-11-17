// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { maskPhone } from "../src/q05-15-mask-phone";
test("問15 maskPhone", () => {
  expect(maskPhone("090-1234-5678")).toBe("090-****-5678");
  expect(maskPhone("080-0000-1111")).toBe("080-****-1111");
  expectTypeOf(maskPhone).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(maskPhone).returns.toEqualTypeOf<string>();
});
