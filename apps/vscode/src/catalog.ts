import { isReadableEnrollmentStatus } from "@stella/shared/enrollment/access";
import type {
  StageWithChildren,
  EnrollmentRow,
  LessonRow,
  LessonType,
  SectionRow,
} from "@stella/shared/cms/types";
import type { TaskStatus, TaskSummary } from "@stella/shared/tasks/catalog";
import { AuthExpiredError, apiRequest } from "./api.js";
import {
  isCatalogLessonComplete,
  lessonCompletePayload,
  markCatalogLessonComplete,
  shouldMarkLessonComplete,
} from "./catalog-progress.js";

export interface CatalogLesson {
  id: string;
  stageId: string;
  title: string;
  type: LessonType;
  completed: boolean;
  markdown?: string;
  pdfPath?: string;
  assignmentId?: string;
  /**
   * 新形式の課題の課題文レッスンなら、その課題 (`tasks.lesson_id`)。ツリーから開くと
   * 課題フォルダーを準備し、編集するファイルと課題文 (進め方つき) を並べる。
   */
  task?: { id: string; status: TaskStatus };
}

export interface CatalogSection {
  id: string;
  title: string;
  lessons: CatalogLesson[];
}

export interface CatalogStage {
  id: string;
  title: string;
  sections: CatalogSection[];
}

interface RowsResponse<T> {
  rows: T[];
}

interface StageDetailResponse {
  stage: StageWithChildren | null;
}

interface LessonProgressRow {
  lesson_id: string;
  completed: boolean | number;
}

let cachedCatalog: CatalogStage[] = [];

export function getCachedCatalog(): CatalogStage[] {
  return cachedCatalog;
}

export function clearCatalog(): void {
  cachedCatalog = [];
}

/** Lesson already loaded with the stage tree — do not refetch. */
export function findCachedLesson(stageId: string, lessonId: string): CatalogLesson | undefined {
  return findCachedLessonContext(stageId, lessonId)?.lesson;
}

export interface CatalogLessonContext {
  lesson: CatalogLesson;
  stageTitle: string;
  sectionTitle: string;
}

/** 提出に載せる講座名 / セクション名は木構造の親からしか取れないので、 まとめて返す。 */
export function findCachedLessonContext(
  stageId: string,
  lessonId: string,
): CatalogLessonContext | undefined {
  for (const stage of cachedCatalog) {
    if (stage.id !== stageId) continue;
    for (const section of stage.sections) {
      const lesson = section.lessons.find((item) => item.id === lessonId);
      if (lesson) {
        return { lesson, stageTitle: stage.title, sectionTitle: section.title };
      }
    }
  }
  return undefined;
}

function isCompleted(value: boolean | number): boolean {
  return value === true || value === 1;
}

/**
 * 演習に出すステージは受講登録ベース (ロールによらず同じ)。
 *
 * 以前は staff だけ「同テナントの公開講座すべて」を出していたが、 Web の受講者シェルが
 * enrollment ベースに一本化されたため、 拡張側も同じにする。 staff が受講者として演習を
 * 確認したい場合は、 受講者と同様に対象講座へ受講登録しておく。
 */
function enrolledStageIds(enrollments: EnrollmentRow[]): string[] {
  return enrollments
    .filter((enrollment) => isReadableEnrollmentStatus(enrollment.status))
    .map((enrollment) => enrollment.stage_id);
}

/** 課題文レッスン (`lessonId`) → 課題。 */
type TasksByLesson = ReadonlyMap<string, { id: string; status: TaskStatus }>;

export function toCatalogStage(
  detail: StageWithChildren,
  completedIds: ReadonlySet<string>,
  tasksByLesson: TasksByLesson = new Map(),
): CatalogStage | null {
  if (detail.stage.status !== "published") {
    return null;
  }
  const sections = detail.sections
    .slice()
    .sort((a, b) => a.section.order - b.section.order)
    .map(({ section, lessons }) =>
      toCatalogSection(detail.stage.id, section, lessons, completedIds, tasksByLesson),
    );
  return {
    id: detail.stage.id,
    title: detail.stage.title,
    sections,
  };
}

function toCatalogSection(
  stageId: string,
  section: SectionRow,
  lessons: LessonRow[],
  completedIds: ReadonlySet<string>,
  tasksByLesson: TasksByLesson,
): CatalogSection {
  return {
    id: section.id,
    title: section.title,
    lessons: lessons
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((lesson) => {
        const task = tasksByLesson.get(lesson.id);
        return {
          id: lesson.id,
          stageId,
          title: lesson.title,
          type: lesson.type,
          completed: completedIds.has(lesson.id),
          ...(lesson.markdown ? { markdown: lesson.markdown } : {}),
          ...(lesson.pdf_path ? { pdfPath: lesson.pdf_path } : {}),
          ...(lesson.assignment_id ? { assignmentId: lesson.assignment_id } : {}),
          ...(task ? { task } : {}),
        };
      }),
  };
}

/** Non-401 detail failures are null. All-null with enrollments is an error, not an empty catalog. */
export function requireLoadedStageDetails(
  stageIds: readonly string[],
  details: readonly unknown[],
): void {
  if (stageIds.length > 0 && details.every((detail) => detail === null)) {
    throw new Error("ステージの読み込みに失敗しました");
  }
}

async function fetchStageDetail(stageId: string): Promise<StageWithChildren | null> {
  try {
    const { stage } = await apiRequest<StageDetailResponse>(
      `/api/cms/stages/${encodeURIComponent(stageId)}`,
    );
    return stage;
  } catch (err) {
    if (err instanceof AuthExpiredError) {
      throw err;
    }
    return null;
  }
}

/**
 * 新形式のステージ (format 2) の課題と、その課題文レッスン。読めなければ空 (ツリーは
 * 課題文をドキュメントとして出すだけで、課題は Web の「VS Code で開く」から開ける)。
 */
async function fetchTasksByLesson(detail: StageWithChildren | null): Promise<TasksByLesson> {
  const map = new Map<string, { id: string; status: TaskStatus }>();
  if (detail?.stage.format !== 2 || detail.stage.status !== "published") return map;
  try {
    const { tasks } = await apiRequest<{ tasks: TaskSummary[] }>(
      `/api/tasks/for-stage/${encodeURIComponent(detail.stage.id)}`,
    );
    for (const task of tasks ?? [])
      if (task.lessonId) map.set(task.lessonId, { id: task.id, status: task.status });
  } catch (err) {
    if (err instanceof AuthExpiredError) throw err;
  }
  return map;
}

/** Fetch enrollments / progress in parallel, then each stage detail (and its tasks). */
export async function loadCatalog(): Promise<CatalogStage[]> {
  const [enrollments, progress] = await Promise.all([
    apiRequest<RowsResponse<EnrollmentRow>>("/api/enrollments/mine"),
    apiRequest<RowsResponse<LessonProgressRow>>("/api/lesson-progress"),
  ]);

  const completedIds = new Set(
    (progress.rows ?? []).filter((row) => isCompleted(row.completed)).map((row) => row.lesson_id),
  );
  const stageIds = enrolledStageIds(enrollments.rows ?? []);
  const details = await Promise.all(stageIds.map(fetchStageDetail));
  requireLoadedStageDetails(stageIds, details);
  const tasks = await Promise.all(details.map(fetchTasksByLesson));

  const catalog: CatalogStage[] = [];
  for (const [index, detail] of details.entries()) {
    if (!detail) continue;
    const stage = toCatalogStage(detail, completedIds, tasks[index]);
    if (stage) catalog.push(stage);
  }
  cachedCatalog = catalog;
  return catalog;
}

export async function markLessonComplete(lessonId: string): Promise<void> {
  const alreadyComplete = isCatalogLessonComplete(cachedCatalog, lessonId);
  if (!shouldMarkLessonComplete(true, alreadyComplete)) {
    return;
  }
  await apiRequest("/api/lesson-progress", {
    method: "POST",
    body: lessonCompletePayload(lessonId, new Date().toISOString()),
  });
  markCatalogLessonComplete(cachedCatalog, lessonId);
}
