import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: { getConfiguration: () => ({ get: () => "http://127.0.0.1:8787" }) },
}));

import { requireLoadedCourseDetails } from "./catalog.js";

describe("requireLoadedCourseDetails", () => {
  it("throws when enrolled course ids exist but every detail is null", () => {
    expect(() => requireLoadedCourseDetails(["c1", "c2"], [null, null])).toThrow(
      "コースの読み込みに失敗しました",
    );
  });

  it("does not throw when there are no course ids", () => {
    expect(() => requireLoadedCourseDetails([], [])).not.toThrow();
  });

  it("does not throw when at least one detail loaded", () => {
    expect(() => requireLoadedCourseDetails(["c1", "c2"], [null, { id: "c2" }])).not.toThrow();
  });
});
