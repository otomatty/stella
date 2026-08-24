import { describe, expect, it, vi } from "vitest";
import { linksForRole } from "./NotFoundScreen";

describe("linksForRole", () => {
  it("sends sales to dashboard and interview-prep, not learner-only pages", () => {
    const setPage = vi.fn();
    const labels = linksForRole("sales", setPage).map((link) => link.label);
    expect(labels).toEqual(["ダッシュボード", "面談対策"]);
    expect(labels).not.toContain("コース一覧");
    expect(labels).not.toContain("修了証");
  });
});
