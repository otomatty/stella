// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lockDoor, type Door } from "../src/q08-03-lock-door";
test("問3 lockDoor", () => {
  expect(lockDoor({ state: "closed" }, "A")).toEqual({ state: "locked", key: "A" });
  expect(lockDoor({ state: "open" }, "A")).toEqual({ state: "open" });
  expectTypeOf(lockDoor).parameters.toEqualTypeOf<[Door, string]>();
  expectTypeOf(lockDoor).returns.toEqualTypeOf<Door>();
});
