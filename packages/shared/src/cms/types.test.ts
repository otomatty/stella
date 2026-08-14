import { describe, expect, it } from "vitest";

import { mapCourseToUi, type CourseRow, type CourseWithChildren } from "./types.js";

function courseRow(overrides: Partial<CourseRow> = {}): CourseRow {
  return {
    id: "course-1",
    tenant_id: "ses",
    slug: "typescript-basics",
    title: "TypeScript 入門研修",
    category: "フロントエンド",
    color: "indigo",
    duration_hours: 28,
    description: null,
    status: "published",
    created_by: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function withChildren(course: CourseRow): CourseWithChildren {
  return { course, sections: [] };
}

describe("mapCourseToUi — 講師名 (Issue #74)", () => {
  it("instructor_name を enrolledBy に載せる", () => {
    const ui = mapCourseToUi(withChildren(courseRow({ instructor_name: "堀江メンター" })));
    expect(ui.enrolledBy).toBe("堀江メンター");
  });

  it("前後の空白を落とす", () => {
    const ui = mapCourseToUi(withChildren(courseRow({ instructor_name: "  堀江メンター  " })));
    expect(ui.enrolledBy).toBe("堀江メンター");
  });

  it("null / 空白のみ / 未マイグレーション (undefined) では enrolledBy を付けない", () => {
    for (const value of [null, "", "   ", undefined]) {
      const ui = mapCourseToUi(withChildren(courseRow({ instructor_name: value })));
      expect(ui.enrolledBy).toBeUndefined();
      expect("enrolledBy" in ui).toBe(false);
    }
  });
});
