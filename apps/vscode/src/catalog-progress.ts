import type { ProgressSyncInput } from "@stella/shared/study/progress-sync";
import type { CatalogStage, CatalogLesson } from "./catalog.js";

/** Call POST only on a first clear. A later fail must not un-complete (OR). */
export function shouldMarkLessonComplete(cleared: boolean, alreadyComplete: boolean): boolean {
  return cleared === true && alreadyComplete !== true;
}

export function lessonCompletePayload(
  lessonId: string,
  updatedAt: string,
): { rows: ProgressSyncInput[] } {
  return {
    rows: [
      {
        lesson_id: lessonId,
        completed: true,
        last_page: null,
        viewed_pages: [],
        watched_sec: null,
        updated_at: updatedAt,
      },
    ],
  };
}

export function flattenLessons(catalog: readonly CatalogStage[]): CatalogLesson[] {
  return catalog.flatMap((stage) => stage.sections.flatMap((section) => section.lessons));
}

export function findNextLesson(
  catalog: readonly CatalogStage[],
  stageId: string,
  lessonId: string,
): CatalogLesson | undefined {
  const stage = catalog.find((item) => item.id === stageId);
  if (!stage) {
    return undefined;
  }
  const lessons = stage.sections.flatMap((section) => section.lessons);
  const index = lessons.findIndex((item) => item.id === lessonId);
  if (index < 0) {
    return undefined;
  }
  return lessons[index + 1];
}

export function findLessonByAssignmentId(
  catalog: readonly CatalogStage[],
  assignmentId: string,
): CatalogLesson | undefined {
  return flattenLessons(catalog).find((lesson) => lesson.assignmentId === assignmentId);
}

export interface ActiveExerciseIds {
  assignmentId: string;
  lessonId: string;
  stageId: string;
}

/** Prefer remembered lesson ids even when the catalog cache has not loaded that row. */
export function resolveLessonForExercise(
  assignmentId: string,
  active: ActiveExerciseIds | undefined,
  catalog: readonly CatalogStage[],
): CatalogLesson | undefined {
  if (active?.assignmentId === assignmentId) {
    const cached = flattenLessons(catalog).find(
      (lesson) => lesson.id === active.lessonId && lesson.stageId === active.stageId,
    );
    if (cached) {
      return cached;
    }
    return {
      id: active.lessonId,
      stageId: active.stageId,
      title: "",
      type: "code",
      completed: false,
      assignmentId: active.assignmentId,
    };
  }
  return findLessonByAssignmentId(catalog, assignmentId);
}

export function isCatalogLessonComplete(
  catalog: readonly CatalogStage[],
  lessonId: string,
): boolean {
  return flattenLessons(catalog).some((lesson) => lesson.id === lessonId && lesson.completed);
}

export function markCatalogLessonComplete(catalog: CatalogStage[], lessonId: string): void {
  for (const stage of catalog) {
    for (const section of stage.sections) {
      for (const lesson of section.lessons) {
        if (lesson.id === lessonId) {
          lesson.completed = true;
        }
      }
    }
  }
}
