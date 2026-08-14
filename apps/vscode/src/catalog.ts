import { isReadableEnrollmentStatus } from "@falcon/shared/enrollment/access";
import type {
  CourseRow,
  CourseWithChildren,
  EnrollmentRow,
  LessonRow,
  LessonType,
  ProfileRole,
  ProfileRow,
  SectionRow,
} from "@falcon/shared/cms/types";
import { AuthExpiredError, apiRequest } from "./api.js";
import {
  isCatalogLessonComplete,
  lessonCompletePayload,
  markCatalogLessonComplete,
  shouldMarkLessonComplete,
} from "./catalog-progress.js";

export interface CatalogLesson {
  id: string;
  courseId: string;
  title: string;
  type: LessonType;
  completed: boolean;
  markdown?: string;
  pdfPath?: string;
  assignmentId?: string;
}

export interface CatalogSection {
  id: string;
  title: string;
  lessons: CatalogLesson[];
}

export interface CatalogCourse {
  id: string;
  title: string;
  sections: CatalogSection[];
}

interface MeResponse {
  profile: ProfileRow;
}

interface RowsResponse<T> {
  rows: T[];
}

interface CourseDetailResponse {
  course: CourseWithChildren | null;
}

interface LessonProgressRow {
  lesson_id: string;
  completed: boolean | number;
}

let cachedCatalog: CatalogCourse[] = [];

export function getCachedCatalog(): CatalogCourse[] {
  return cachedCatalog;
}

export function clearCatalog(): void {
  cachedCatalog = [];
}

/** Lesson already loaded with the course tree — do not refetch. */
export function findCachedLesson(courseId: string, lessonId: string): CatalogLesson | undefined {
  for (const course of cachedCatalog) {
    if (course.id !== courseId) continue;
    for (const section of course.sections) {
      const lesson = section.lessons.find((item) => item.id === lessonId);
      if (lesson) return lesson;
    }
  }
  return undefined;
}

function isStaffRole(role: ProfileRole): boolean {
  switch (role) {
    case "instructor":
    case "admin":
    case "platform_admin":
      return true;
    case "student":
      return false;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function isCompleted(value: boolean | number): boolean {
  return value === true || value === 1;
}

function courseIdsForRole(
  role: ProfileRole,
  enrollments: EnrollmentRow[],
  courses: CourseRow[],
): string[] {
  if (isStaffRole(role)) {
    return courses.filter((course) => course.status === "published").map((course) => course.id);
  }
  return enrollments
    .filter((enrollment) => isReadableEnrollmentStatus(enrollment.status))
    .map((enrollment) => enrollment.course_id);
}

function toCatalogCourse(
  detail: CourseWithChildren,
  completedIds: ReadonlySet<string>,
): CatalogCourse | null {
  if (detail.course.status !== "published") {
    return null;
  }
  const sections = detail.sections
    .slice()
    .sort((a, b) => a.section.order - b.section.order)
    .map(({ section, lessons }) => toCatalogSection(detail.course.id, section, lessons, completedIds));
  return {
    id: detail.course.id,
    title: detail.course.title,
    sections,
  };
}

function toCatalogSection(
  courseId: string,
  section: SectionRow,
  lessons: LessonRow[],
  completedIds: ReadonlySet<string>,
): CatalogSection {
  return {
    id: section.id,
    title: section.title,
    lessons: lessons
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((lesson) => ({
        id: lesson.id,
        courseId,
        title: lesson.title,
        type: lesson.type,
        completed: completedIds.has(lesson.id),
        ...(lesson.markdown ? { markdown: lesson.markdown } : {}),
        ...(lesson.pdf_path ? { pdfPath: lesson.pdf_path } : {}),
        ...(lesson.assignment_id ? { assignmentId: lesson.assignment_id } : {}),
      })),
  };
}

/** Non-401 detail failures are null. All-null with enrollments is an error, not an empty catalog. */
export function requireLoadedCourseDetails(
  courseIds: readonly string[],
  details: readonly unknown[],
): void {
  if (courseIds.length > 0 && details.every((detail) => detail === null)) {
    throw new Error("コースの読み込みに失敗しました");
  }
}

async function fetchCourseDetail(courseId: string): Promise<CourseWithChildren | null> {
  try {
    const { course } = await apiRequest<CourseDetailResponse>(
      `/api/cms/courses/${encodeURIComponent(courseId)}`,
    );
    return course;
  } catch (err) {
    if (err instanceof AuthExpiredError) {
      throw err;
    }
    return null;
  }
}

/** Fetch me / enrollments / courses / progress in parallel, then each course detail. */
export async function loadCatalog(): Promise<CatalogCourse[]> {
  const [me, enrollments, courses, progress] = await Promise.all([
    apiRequest<MeResponse>("/api/me"),
    apiRequest<RowsResponse<EnrollmentRow>>("/api/enrollments/mine"),
    apiRequest<RowsResponse<CourseRow>>("/api/cms/courses"),
    apiRequest<RowsResponse<LessonProgressRow>>("/api/lesson-progress"),
  ]);

  const completedIds = new Set(
    (progress.rows ?? [])
      .filter((row) => isCompleted(row.completed))
      .map((row) => row.lesson_id),
  );
  const courseIds = courseIdsForRole(me.profile.role, enrollments.rows ?? [], courses.rows ?? []);
  const details = await Promise.all(courseIds.map(fetchCourseDetail));
  requireLoadedCourseDetails(courseIds, details);

  const catalog: CatalogCourse[] = [];
  for (const detail of details) {
    if (!detail) continue;
    const course = toCatalogCourse(detail, completedIds);
    if (course) catalog.push(course);
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
