import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: { getConfiguration: () => ({ get: () => "http://127.0.0.1:8787" }) },
}));

import { requireLoadedStageDetails } from "./catalog.js";

describe("requireLoadedStageDetails", () => {
  it("throws when enrolled stage ids exist but every detail is null", () => {
    expect(() => requireLoadedStageDetails(["c1", "c2"], [null, null])).toThrow(
      "ステージの読み込みに失敗しました",
    );
  });

  it("does not throw when there are no stage ids", () => {
    expect(() => requireLoadedStageDetails([], [])).not.toThrow();
  });

  it("does not throw when at least one detail loaded", () => {
    expect(() => requireLoadedStageDetails(["c1", "c2"], [null, { id: "c2" }])).not.toThrow();
  });
});
