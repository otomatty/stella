import { describe, expect, it } from "vitest";

import {
  canManageInterviewPrepUi,
  filterSearchResultsForLearner,
  resolveUiRole,
  staffHomeLabel,
} from "./ui-role.js";

describe("resolveUiRole", () => {
  it("uses the profile role when backend is on and there is no override", () => {
    expect(
      resolveUiRole({
        backendEnabled: true,
        profileRole: "admin",
        uiRoleOverride: null,
        demoRole: "learner",
      }),
    ).toEqual({ role: "admin", canSwitchToLearner: true });
  });

  it("lets staff open the learner shell", () => {
    expect(
      resolveUiRole({
        backendEnabled: true,
        profileRole: "admin",
        uiRoleOverride: "learner",
        demoRole: "admin",
      }),
    ).toEqual({ role: "learner", canSwitchToLearner: true });
  });

  it("ignores a leftover override for students", () => {
    expect(
      resolveUiRole({
        backendEnabled: true,
        profileRole: "student",
        uiRoleOverride: "learner",
        demoRole: "admin",
      }),
    ).toEqual({ role: "learner", canSwitchToLearner: false });
  });

  it("keeps the demo Tweaks role when the backend is off", () => {
    expect(
      resolveUiRole({
        backendEnabled: false,
        profileRole: undefined,
        uiRoleOverride: "learner",
        demoRole: "instructor",
      }),
    ).toEqual({ role: "instructor", canSwitchToLearner: false });
  });

  it("maps sales to the sales shell and does not offer the learner switch", () => {
    expect(
      resolveUiRole({
        backendEnabled: true,
        profileRole: "sales",
        uiRoleOverride: null,
        demoRole: "learner",
      }),
    ).toEqual({ role: "sales", canSwitchToLearner: false });
  });

  it("ignores a leftover learner override for sales", () => {
    expect(
      resolveUiRole({
        backendEnabled: true,
        profileRole: "sales",
        uiRoleOverride: "learner",
        demoRole: "admin",
      }),
    ).toEqual({ role: "sales", canSwitchToLearner: false });
  });
});

describe("staffHomeLabel", () => {
  it("names the screen the staff member returns to", () => {
    expect(staffHomeLabel("admin")).toBe("管理画面に戻る");
    expect(staffHomeLabel("instructor")).toBe("講師画面に戻る");
    expect(staffHomeLabel("sales")).toBe("営業画面に戻る");
  });
});

describe("canManageInterviewPrepUi", () => {
  it("is true for staff and sales, false for students and missing role", () => {
    expect(canManageInterviewPrepUi("instructor")).toBe(true);
    expect(canManageInterviewPrepUi("admin")).toBe(true);
    expect(canManageInterviewPrepUi("platform_admin")).toBe(true);
    expect(canManageInterviewPrepUi("sales")).toBe(true);
    expect(canManageInterviewPrepUi("student")).toBe(false);
    expect(canManageInterviewPrepUi(undefined)).toBe(false);
  });
});

describe("filterSearchResultsForLearner", () => {
  const results = [
    {
      kind: "stage" as const,
      id: "pub",
      stage_id: "pub",
      title: "公開",
      subtitle: null,
      stage_title: "公開",
      lesson_type: null,
    },
    {
      kind: "lesson" as const,
      id: "l1",
      stage_id: "draft",
      title: "下書き",
      subtitle: null,
      stage_title: "下書き",
      lesson_type: null,
    },
  ];

  it("keeps every hit when there is no stage scope", () => {
    expect(filterSearchResultsForLearner(results, null)).toEqual(results);
  });

  it("drops hits whose stage is outside the learner's own stages", () => {
    expect(filterSearchResultsForLearner(results, new Set(["pub"]))).toEqual([results[0]]);
  });
});
