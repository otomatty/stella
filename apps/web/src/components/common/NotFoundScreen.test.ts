import { describe, expect, it, vi } from "vitest";
import { linksForRole } from "./NotFoundScreen";

describe("linksForRole", () => {
  it("sends learners to the skill tree, records and certificates", () => {
    const setPage = vi.fn();
    const labels = linksForRole("learner", setPage).map((link) => link.label);
    expect(labels).toEqual(["スキルツリー", "学習の記録", "修了証"]);
  });

  it("does not offer the retired interview-prep page to any role", () => {
    const setPage = vi.fn();
    for (const role of ["learner", "instructor", "admin"] as const) {
      const labels = linksForRole(role, setPage).map((link) => link.label);
      expect(labels).not.toContain("面談対策");
    }
  });
});
