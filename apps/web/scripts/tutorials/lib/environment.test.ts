import { expect, it } from "vitest";
import { seedSqlArgs } from "./environment";

it("収録用 D1 を指定した Wrangler の引数配列を作る", () => {
  expect(seedSqlArgs("/tmp/tutorial state", "SELECT 1;")).toEqual([
    "x",
    "wrangler",
    "d1",
    "execute",
    "stella-db",
    "--local",
    "--persist-to",
    "/tmp/tutorial state",
    "--command",
    "SELECT 1;",
  ]);
});

it("空白・引用符・改行・シェルの記号を含む SQL も、そのまま 1 引数で渡す", () => {
  const sql = "INSERT INTO example (value) VALUES ('引用符 \" $HOME `id` $(id);');\nSELECT 2;";
  const args = seedSqlArgs("/tmp/tutorial", sql);
  expect(args).toHaveLength(10);
  expect(args.at(-2)).toBe("--command");
  expect(args.at(-1)).toBe(sql);
});
