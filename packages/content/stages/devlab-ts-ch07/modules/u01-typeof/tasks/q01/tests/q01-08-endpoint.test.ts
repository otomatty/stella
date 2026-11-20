// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type Endpoint } from "../src/q01-08-endpoint";
test("問8 Endpoint", () => {
  expectTypeOf<Endpoint>().toEqualTypeOf<"/api/users" | "/api/rooms">();
});
