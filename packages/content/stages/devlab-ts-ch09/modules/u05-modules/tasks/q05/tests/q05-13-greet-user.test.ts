// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { greetUser } from "../src/q05-13-greet-user";
test("問13 greetUser", () => {
  // re-export なら、shared/q05-modules.lib の関数 greet そのものになる
  expect(greetUser.name).toBe("greet");
  expect(greetUser("佐藤")).toBe("ようこそ、佐藤さん");
});
