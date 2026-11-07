// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeHistory } from "../src/q08-11-make-history";
test("問11 makeHistory", () => {
  const history = makeHistory();
  history.add("a");
  history.add("b");
  const listed = history.list();
  expect(listed).toEqual(["a", "b"]);
  listed.push("x");
  expect(history.list()).toEqual(["a", "b"]);
  expectTypeOf(makeHistory).parameters.toEqualTypeOf<[]>();
  expectTypeOf(makeHistory).returns.toEqualTypeOf<{
    add: (text: string) => void;
    list: () => string[];
  }>();
});
