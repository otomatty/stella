// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { dayType } from "../src/q07-04-day-type";
test("問4 dayType", () => {
  expect(dayType(0)).toBe("休日");
  expect(dayType(3)).toBe("平日");
  expectTypeOf(dayType).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(dayType).returns.toEqualTypeOf<"平日" | "休日">();
});
