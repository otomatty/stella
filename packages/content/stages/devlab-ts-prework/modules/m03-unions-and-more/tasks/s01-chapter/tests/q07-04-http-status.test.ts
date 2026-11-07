// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { HTTP_STATUS } from "../src/q07-04-http-status";
test("問4 HTTP_STATUS", () => {
  expect(HTTP_STATUS).toEqual({ ok: 200, notFound: 404 });
  expectTypeOf<typeof HTTP_STATUS>().toEqualTypeOf<{ readonly ok: 200; readonly notFound: 404 }>();
});
