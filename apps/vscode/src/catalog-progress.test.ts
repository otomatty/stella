import { describe, expect, it } from "vitest";
import type { CatalogStage, CatalogLesson } from "./catalog.js";
import {
  findLessonByAssignmentId,
  findNextLesson,
  isCatalogLessonComplete,
  lessonCompletePayload,
  markCatalogLessonComplete,
  resolveLessonForExercise,
  shouldMarkLessonComplete,
} from "./catalog-progress.js";

function lesson(
  partial: Pick<CatalogLesson, "id" | "stageId" | "title"> & Partial<CatalogLesson>,
): CatalogLesson {
  return {
    type: "code",
    completed: false,
    ...partial,
  };
}

const catalog: CatalogStage[] = [
  {
    id: "c1",
    title: "Stage 1",
    sections: [
      {
        id: "s1",
        title: "Section 1",
        lessons: [
          lesson({ id: "l1", stageId: "c1", title: "One", assignmentId: "asg-1" }),
          lesson({ id: "l2", stageId: "c1", title: "Two", type: "text" }),
        ],
      },
      {
        id: "s2",
        title: "Section 2",
        lessons: [lesson({ id: "l3", stageId: "c1", title: "Three", assignmentId: "asg-3" })],
      },
    ],
  },
];

describe("shouldMarkLessonComplete", () => {
  it("is true only on a first clear", () => {
    expect(shouldMarkLessonComplete(true, false)).toBe(true);
  });

  it("does not mark when the grade did not clear", () => {
    expect(shouldMarkLessonComplete(false, false)).toBe(false);
    expect(shouldMarkLessonComplete(false, true)).toBe(false);
  });

  it("does not POST again after the lesson is already complete (OR)", () => {
    expect(shouldMarkLessonComplete(true, true)).toBe(false);
  });
});

describe("lessonCompletePayload", () => {
  it("sends ProgressSyncInput rows with completed true", () => {
    expect(lessonCompletePayload("lesson-1", "2026-08-14T04:00:00.000Z")).toEqual({
      rows: [
        {
          lesson_id: "lesson-1",
          completed: true,
          last_page: null,
          viewed_pages: [],
          watched_sec: null,
          updated_at: "2026-08-14T04:00:00.000Z",
        },
      ],
    });
  });
});

describe("findNextLesson", () => {
  it("returns the next lesson in the same section", () => {
    expect(findNextLesson(catalog, "c1", "l1")?.id).toBe("l2");
  });

  it("crosses into the next section", () => {
    expect(findNextLesson(catalog, "c1", "l2")?.id).toBe("l3");
  });

  it("returns undefined on the last lesson", () => {
    expect(findNextLesson(catalog, "c1", "l3")).toBeUndefined();
  });
});

describe("findLessonByAssignmentId", () => {
  it("finds the catalog lesson for an exercise folder", () => {
    expect(findLessonByAssignmentId(catalog, "asg-3")?.id).toBe("l3");
  });
});

describe("resolveLessonForExercise", () => {
  const active = { assignmentId: "asg-1", lessonId: "l1", stageId: "c1" };

  it("returns the catalog row when the cache has the remembered lesson", () => {
    expect(resolveLessonForExercise("asg-1", active, catalog)?.title).toBe("One");
  });

  it("keeps remembered lesson ids when the catalog cache is empty", () => {
    const resolved = resolveLessonForExercise("asg-1", active, []);
    expect(resolved).toEqual({
      id: "l1",
      stageId: "c1",
      title: "",
      type: "code",
      completed: false,
      assignmentId: "asg-1",
    });
  });

  it("looks up by assignment id when there is no remembered lesson", () => {
    expect(resolveLessonForExercise("asg-3", undefined, catalog)?.id).toBe("l3");
    expect(resolveLessonForExercise("asg-3", undefined, [])).toBeUndefined();
  });
});

describe("markCatalogLessonComplete", () => {
  it("sets completed true and never clears another lesson", () => {
    const copy: CatalogStage[] = structuredClone(catalog);
    markCatalogLessonComplete(copy, "l1");
    expect(isCatalogLessonComplete(copy, "l1")).toBe(true);
    expect(isCatalogLessonComplete(copy, "l2")).toBe(false);
    markCatalogLessonComplete(copy, "l2");
    expect(isCatalogLessonComplete(copy, "l1")).toBe(true);
  });
});
