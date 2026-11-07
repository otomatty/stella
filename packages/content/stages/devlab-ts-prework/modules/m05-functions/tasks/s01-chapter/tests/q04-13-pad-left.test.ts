// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { padLeft } from "../src/q04-13-pad-left";
test("問13 padLeft", () => {
  expect(padLeft("ab")).toBe("   ab");
  expect(padLeft("7", 3, "0")).toBe("007");
  expectTypeOf(padLeft).parameters.toEqualTypeOf<[string, number?, string?]>();
  expectTypeOf(padLeft).returns.toEqualTypeOf<string>();
});
