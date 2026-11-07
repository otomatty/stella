// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { openDoor, type Door } from "../src/q08-02-open-door";
test("問2 openDoor", () => {
  expect(openDoor({ state: "closed" })).toEqual({ state: "open" });
  expect(openDoor({ state: "locked", key: "A" })).toEqual({ state: "locked", key: "A" });
  expect(openDoor({ state: "open" })).toEqual({ state: "open" });
  expectTypeOf(openDoor).parameters.toEqualTypeOf<[Door]>();
  expectTypeOf(openDoor).returns.toEqualTypeOf<Door>();
});
