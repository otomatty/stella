// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { updateById } from "../src/q07-14-update-by-id";
test("問14 updateById", () => {
  const rows = [
    { id: 1, name: "a" },
    { id: 2, name: "b" },
  ];
  expect(updateById(rows, 1, { name: "z" })).toEqual([
    { id: 1, name: "z" },
    { id: 2, name: "b" },
  ]);
  expect(rows[0]?.name).toBe("a");
});
