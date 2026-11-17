// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { titleText } from "../src/q02-16-title-text";
test("問16 titleText", () => {
  expect(titleText({ title: "入門", subtitle: "TypeScript" })).toBe("入門: TypeScript");
  expect(titleText({ title: "入門" })).toBe("入門");
  expectTypeOf(titleText).parameters.toEqualTypeOf<[{ title: string; subtitle?: string }]>();
  expectTypeOf(titleText).returns.toEqualTypeOf<string>();
});
