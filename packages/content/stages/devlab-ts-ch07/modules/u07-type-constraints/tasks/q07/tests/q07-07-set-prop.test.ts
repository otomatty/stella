// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { setProp } from "../src/q07-07-set-prop";
test("問7 setProp", () => {
  const user = { name: "山田", age: 30 };
  expect(setProp(user, "age", 31)).toEqual({ name: "山田", age: 31 });
  expect(user.age).toBe(30);
  const call = () => {
    // @ts-expect-error age に文字列は入れられない
    setProp(user, "age", "31");
  };
  expect(typeof call).toBe("function");
});
