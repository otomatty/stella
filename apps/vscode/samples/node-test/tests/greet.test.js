import { describe, expect, test } from "vitest";
import { greet } from "../src/greet.js";

describe("greet", () => {
  test("名前を入れたあいさつを返す", () => {
    expect(greet("山田")).toBe("こんにちは、山田さん");
  });
});
