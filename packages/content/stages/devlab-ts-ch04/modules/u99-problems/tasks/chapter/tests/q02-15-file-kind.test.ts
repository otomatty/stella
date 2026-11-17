// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { fileKind } from "../src/q02-15-file-kind";
test("問15 fileKind", () => {
  expect(fileKind("jpg")).toBe("画像");
  expect(fileKind("mov")).toBe("動画");
  expect(fileKind("pdf")).toBe("文書");
  expect(fileKind("zip")).toBe("その他");
  expectTypeOf(fileKind).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(fileKind).returns.toEqualTypeOf<"画像" | "動画" | "文書" | "その他">();
});
