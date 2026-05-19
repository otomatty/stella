/**
 * CMS DB 行と UI ドメイン型を繋ぐ型 + マッパー。
 *
 * - DB 列は snake_case。 UI (apps/web/src/data/types.ts の Course / Section / Lesson) は camelCase。
 *   - 受講者 UI が既存型を消費し続けられるよう、 マッパーで camelCase 形に正規化する。
 * - assignment は @falcon/shared の Assignment 型を直接 import して、 grading パイプラインを変更せずに済む形で読み戻す。
 */

import type {
  Assignment,
  AssignmentFile,
  ASTRequirement,
  ChapterId,
  ESLintRuleConfig,
  Language,
  LintPreset,
  MutationConfig,
  Stage,
  TestCase,
  TestKind,
} from "../types.js";

// ---------------------------------------------------------------
// 列レベル型
// ---------------------------------------------------------------

export type CourseStatus = "draft" | "published" | "archived";
export type ProfileRole = "student" | "instructor" | "admin";

export type CourseColor = "indigo" | "green" | "amber" | "slate";

export type LessonType =
  | "video"
  | "slides"
  | "text"
  | "quiz"
  | "assignment"
  | "code";

// ---------------------------------------------------------------
// DB 行型
// ---------------------------------------------------------------

export interface TenantRow {
  id: string;
  name: string;
  subtitle: string | null;
  icon: string | null;
  active_count: number;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  tenant_id: string;
  role: ProfileRole;
  display_name: string;
  initials: string | null;
  email: string | null;
  created_at: string;
}

export interface CourseRow {
  id: string;
  tenant_id: string;
  slug: string;
  title: string;
  category: string | null;
  color: CourseColor | null;
  duration_hours: number | null;
  description: string | null;
  status: CourseStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SectionRow {
  id: string;
  course_id: string;
  title: string;
  order: number;
  created_at: string;
}

export interface LessonRow {
  id: string;
  section_id: string;
  title: string;
  type: LessonType;
  order: number;
  duration_label: string | null;
  video_path: string | null;
  pdf_path: string | null;
  markdown: string | null;
  assignment_id: string | null;
  total_pages: number | null;
  total_sec: number | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentRow {
  id: string;
  tenant_id: string;
  stage: Stage;
  chapter_id: ChapterId;
  title: string;
  description: string;
  language: Language;
  test_kind: TestKind;
  starter_files: AssignmentFile[];
  entry_file: string | null;
  entry_points: string[] | null;
  tests: TestCase[];
  sql_seed: string | null;
  lint_preset: LintPreset | null;
  static_analysis: { eslint?: { rules: Record<string, ESLintRuleConfig> }; ast?: ASTRequirement } | null;
  mutation: MutationConfig | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------
// UI ドメイン型 (apps/web/src/data/types.ts と shape を一致)
// 受講者 UI は変更せずにこの型を受け取れるよう、 同じプロパティ名を使う。
// ---------------------------------------------------------------

export type LessonStatus = "done" | "active" | "todo" | "locked";

export interface UiLesson {
  id: string;
  title: string;
  type: LessonType;
  duration: string;
  status: LessonStatus;
  progress?: number;
  videoPath?: string;
  pdfPath?: string;
  markdown?: string;
  assignmentId?: string;
  totalPages?: number;
  totalSec?: number;
}

export interface UiSection {
  id: string;
  title: string;
  lessons: UiLesson[];
}

export interface UiCourse {
  id: string;
  title: string;
  category: string;
  color: CourseColor;
  duration?: number;
  lessonsCount: number;
  progress: number;
  enrolledBy?: string;
  dueAt?: string | null;
  description?: string;
  completed?: boolean;
  sections?: UiSection[];
}

// ---------------------------------------------------------------
// マッパー (DB row → UI / Assignment)
// ---------------------------------------------------------------

export function mapLessonRowToUi(row: LessonRow): UiLesson {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    duration: row.duration_label ?? "",
    status: "todo",
    ...(row.video_path != null ? { videoPath: row.video_path } : {}),
    ...(row.pdf_path != null ? { pdfPath: row.pdf_path } : {}),
    ...(row.markdown != null ? { markdown: row.markdown } : {}),
    ...(row.assignment_id != null ? { assignmentId: row.assignment_id } : {}),
    ...(row.total_pages != null ? { totalPages: row.total_pages } : {}),
    ...(row.total_sec != null ? { totalSec: row.total_sec } : {}),
  };
}

export function mapSectionRowToUi(
  row: SectionRow,
  lessons: LessonRow[],
): UiSection {
  return {
    id: row.id,
    title: row.title,
    lessons: lessons
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(mapLessonRowToUi),
  };
}

export interface CourseWithChildren {
  course: CourseRow;
  sections: Array<{ section: SectionRow; lessons: LessonRow[] }>;
}

export function mapCourseToUi(input: CourseWithChildren): UiCourse {
  const sections = input.sections
    .slice()
    .sort((a, b) => a.section.order - b.section.order)
    .map(({ section, lessons }) => mapSectionRowToUi(section, lessons));

  const lessonsCount = sections.reduce((n, s) => n + s.lessons.length, 0);
  return {
    id: input.course.id,
    title: input.course.title,
    category: input.course.category ?? "",
    color: input.course.color ?? "indigo",
    ...(input.course.duration_hours != null
      ? { duration: input.course.duration_hours }
      : {}),
    lessonsCount,
    progress: 0,
    ...(input.course.description != null
      ? { description: input.course.description }
      : {}),
    sections,
  };
}

export function mapAssignmentRowToAssignment(row: AssignmentRow): Assignment {
  const base = {
    id: row.id,
    stage: row.stage,
    chapterId: row.chapter_id,
    sequence: 0,
    title: row.title,
    newConcept: "",
    estimatedMinutes: 5,
    difficulty: 1 as const,
    description: row.description,
    language: row.language,
    starterFiles: row.starter_files,
    ...(row.entry_file ? { entryFile: row.entry_file } : {}),
    ...(row.sql_seed ? { sqlSeed: row.sql_seed } : {}),
    ...(row.entry_points ? { entryPoints: row.entry_points } : {}),
    tests: row.tests,
    ...(row.lint_preset ? { lintPreset: row.lint_preset } : {}),
    ...(row.static_analysis ? { staticAnalysis: row.static_analysis } : {}),
  };

  if (row.test_kind === "mutation" || row.test_kind === "eslint-config") {
    if (!row.mutation) {
      throw new Error(
        `Assignment ${row.id} has test_kind=${row.test_kind} but no mutation config`,
      );
    }
    return { ...base, testKind: row.test_kind, mutation: row.mutation };
  }
  return { ...base, testKind: row.test_kind };
}
