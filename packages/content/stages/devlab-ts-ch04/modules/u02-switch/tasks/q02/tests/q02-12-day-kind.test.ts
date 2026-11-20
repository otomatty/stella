// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { dayKind } from "../src/q02-12-day-kind";
test("問12 dayKind", () => {
  expect(dayKind("月")).toBe("平日");
  expect(dayKind("金")).toBe("平日");
  expect(dayKind("土")).toBe("週末");
  expect(dayKind("日")).toBe("週末");
  expect(() => dayKind("祝")).toThrow(Error);
  expectTypeOf(dayKind).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(dayKind).returns.toEqualTypeOf<"平日" | "週末">();
});
