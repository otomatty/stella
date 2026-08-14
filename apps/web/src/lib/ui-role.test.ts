import { describe, expect, it } from "vitest";

import { filterSearchResultsForPreview, resolveUiRole, staffHomeLabel } from "./ui-role.js";

describe("resolveUiRole", () => {
  it("uses the profile role when backend is on and there is no override", () => {
    expect(
      resolveUiRole({
        backendEnabled: true,
        profileRole: "admin",
        uiRoleOverride: null,
        demoRole: "learner",
      }),
    ).toEqual({
      role: "admin",
      previewingLearner: false,
      canSwitchToLearner: true,
    });
  });

  it("lets staff preview the learner shell", () => {
    expect(
      resolveUiRole({
        backendEnabled: true,
        profileRole: "admin",
        uiRoleOverride: "learner",
        demoRole: "admin",
      }),
    ).toEqual({
      role: "learner",
      previewingLearner: true,
      canSwitchToLearner: true,
    });
  });

  it("ignores a leftover override for students", () => {
    expect(
      resolveUiRole({
        backendEnabled: true,
        profileRole: "student",
        uiRoleOverride: "learner",
        demoRole: "admin",
      }),
    ).toEqual({
      role: "learner",
      previewingLearner: false,
      canSwitchToLearner: false,
    });
  });

  it("keeps the demo Tweaks role when the backend is off", () => {
    expect(
      resolveUiRole({
        backendEnabled: false,
        profileRole: undefined,
        uiRoleOverride: "learner",
        demoRole: "instructor",
      }),
    ).toEqual({
      role: "instructor",
      previewingLearner: false,
      canSwitchToLearner: false,
    });
  });
});

describe("staffHomeLabel", () => {
  it("names the screen the staff member returns to", () => {
    expect(staffHomeLabel("admin")).toBe("管理画面に戻る");
    expect(staffHomeLabel("instructor")).toBe("講師画面に戻る");
  });
});

describe("filterSearchResultsForPreview", () => {
  const results = [
    {
      kind: "course" as const,
      id: "pub",
      course_id: "pub",
      title: "公開",
      subtitle: null,
      course_title: "公開",
      lesson_type: null,
    },
    {
      kind: "lesson" as const,
      id: "l1",
      course_id: "draft",
      title: "下書き",
      subtitle: null,
      course_title: "下書き",
      lesson_type: null,
    },
  ];

  it("keeps every hit when there is no preview scope", () => {
    expect(filterSearchResultsForPreview(results, null)).toEqual(results);
  });

  it("drops hits whose course is outside the published catalog", () => {
    expect(filterSearchResultsForPreview(results, new Set(["pub"]))).toEqual([
      results[0],
    ]);
  });
});
