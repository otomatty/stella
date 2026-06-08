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
  /**
   * 無効化フラグ (Issue #22)。 列が未マイグレーションの環境では undefined になり得るため optional。
   * service-role API 経由でのみ更新され、 同時に auth.users 側も ban される。
   */
  disabled?: boolean;
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

export type QuestionKind = "single" | "multiple" | "boolean";

export interface QuizRow {
  id: string;
  lesson_id: string;
  pass_score: number;
  time_limit_sec: number | null;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  max_attempts: number | null;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestionRow {
  id: string;
  quiz_id: string;
  kind: QuestionKind;
  prompt: string;
  explanation: string | null;
  points: number;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface QuizOptionRow {
  id: string;
  question_id: string;
  label: string;
  is_correct: boolean;
  order: number;
}

export interface QuizAttemptRow {
  id: string;
  tenant_id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  max_score: number;
  passed: boolean;
  answers: QuizAnswer[];
  submitted_at: string;
}

/** CMS で読み込む quiz 全体 (設問 + 選択肢をネスト)。 */
export interface QuizWithQuestions {
  quiz: QuizRow;
  questions: Array<QuizQuestionRow & { options: QuizOptionRow[] }>;
}

/** 受講者へ送る回答 payload。 */
export interface QuizAnswer {
  question_id: string;
  selected_option_ids: string[];
}

/**
 * 受講者向けにサニタイズされた設問 (is_correct / explanation を含めない)。
 * get_quiz_for_lesson RPC の戻り値に対応する。
 */
export interface LearnerQuizOption {
  id: string;
  label: string;
  order: number;
}

export interface LearnerQuizQuestion {
  id: string;
  kind: QuestionKind;
  prompt: string;
  points: number;
  order: number;
  options: LearnerQuizOption[];
}

export interface LearnerQuizConfig {
  id: string;
  lesson_id: string;
  pass_score: number;
  time_limit_sec: number | null;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  max_attempts: number | null;
}

export interface LearnerQuiz {
  quiz: LearnerQuizConfig;
  questions: LearnerQuizQuestion[];
}

/** submit_quiz_attempt RPC の採点結果。 */
export interface QuizQuestionResult {
  question_id: string;
  correct: boolean;
  correct_option_ids: string[];
  explanation: string | null;
}

export interface QuizGradeResult {
  score: number;
  max_score: number;
  passed: boolean;
  results: QuizQuestionResult[];
}

export type EnrollmentStatus = "active" | "completed" | "expired";

/**
 * 受講登録 (Issue #20)。 「誰がどのコースを、 いつまでに受講するか」 を表す。
 * 割当は instructor/admin が RLS 配下で行い、 受講者は自分の行のみ read 可能。
 */
export interface EnrollmentRow {
  id: string;
  tenant_id: string;
  user_id: string;
  course_id: string;
  assigned_by: string | null;
  due_at: string | null;
  required: boolean;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
}

export type QuestionStatus = "open" | "answered" | "closed";

/**
 * Q&A スレッドのルート (Issue #24)。 course / lesson に紐付く受講者の質問。
 * author_name / author_initials は profiles の RLS を跨がず描画するための denormalize。
 */
export interface QuestionRow {
  id: string;
  tenant_id: string;
  course_id: string;
  lesson_id: string | null;
  author_id: string;
  author_name: string;
  author_initials: string | null;
  title: string;
  body: string;
  status: QuestionStatus;
  created_at: string;
  updated_at: string;
}

/** Q&A スレッドへの返信 (受講者の追記 / 講師の回答)。 */
export interface QuestionReplyRow {
  id: string;
  question_id: string;
  author_id: string;
  author_name: string;
  author_initials: string | null;
  body: string;
  is_instructor: boolean;
  created_at: string;
}

/** スレッド + 返信をネストした読み出し形 (created_at 昇順)。 */
export interface QuestionWithReplies extends QuestionRow {
  replies: QuestionReplyRow[];
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
  demo_call: string | null;
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
  /** 受講登録 (Issue #20) 由来。 必須 / 任意の区別。 */
  required?: boolean;
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
    ...(row.demo_call ? { demoCall: row.demo_call } : {}),
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
