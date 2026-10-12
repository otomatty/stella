import { describe, expect, it } from "vitest";

import { safeReturnPath } from "./clerk";

describe("safeReturnPath (Google から戻ったあとに開くページ)", () => {
  it("同じオリジンのパスはそのまま戻す", () => {
    expect(safeReturnPath("/stages/abc?tab=docs#top")).toBe("/stages/abc?tab=docs#top");
    expect(safeReturnPath("/")).toBe("/");
  });

  it("別のオリジンやコールバック自身へは戻さない", () => {
    for (const value of [
      null,
      "",
      "https://evil.example/",
      "//evil.example/",
      "/\\evil.example/",
      "javascript:alert(1)",
      "/auth/callback?x=1",
    ]) {
      expect(safeReturnPath(value)).toBe("/");
    }
  });
});
