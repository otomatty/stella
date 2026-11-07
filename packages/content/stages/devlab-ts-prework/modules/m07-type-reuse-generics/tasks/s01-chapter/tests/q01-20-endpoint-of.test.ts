// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { endpointOf } from "../src/q01-20-endpoint-of";
test("問20 endpointOf", () => {
  expect(endpointOf("rooms")).toBe("/api/rooms");
  expectTypeOf(endpointOf).parameters.toEqualTypeOf<["users" | "rooms"]>();
  expectTypeOf(endpointOf).returns.toEqualTypeOf<string>();
});
