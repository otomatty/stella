// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { closeDoor, type Door } from "../src/q08-01-close-door";
test("問1 closeDoor", () => {
  expect(closeDoor({ state: "open" })).toEqual({ state: "closed" });
  expect(closeDoor({ state: "locked", key: "A" })).toEqual({ state: "locked", key: "A" });
  expectTypeOf(closeDoor).parameters.toEqualTypeOf<[Door]>();
  expectTypeOf(closeDoor).returns.toEqualTypeOf<Door>();
});
