// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { unlockDoor, type Door } from "../src/q08-04-unlock-door";
test("問4 unlockDoor", () => {
  expect(unlockDoor({ state: "locked", key: "A" }, "A")).toEqual({ state: "closed" });
  expect(unlockDoor({ state: "locked", key: "A" }, "B")).toEqual({ state: "locked", key: "A" });
  expect(unlockDoor({ state: "open" }, "A")).toEqual({ state: "open" });
  expectTypeOf(unlockDoor).parameters.toEqualTypeOf<[Door, string]>();
  expectTypeOf(unlockDoor).returns.toEqualTypeOf<Door>();
});
