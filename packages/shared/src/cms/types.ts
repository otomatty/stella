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
export type ProfileRole = "student" | "instructor" | "admin" | "platform_admin";

export type CourseColor = "indigo" | "green" | "amber" | "slate";

export type LessonType = "video" | "slides" | "text" | "quiz" | "assignment" | "code";

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

/** GET /api/me が profile と一緒に返す所属テナントの表示情報。 */
export interface ProfileTenantInfo {
  id: string;
  name: string;
  subtitle: string | null;
  icon: string | null;
}

export interface ProfileRow {
  id: string;
  tenant_id: string;
  role: ProfileRole;
  display_name: string;
  initials: string | null;
  /** Google アカウントのプロフィール画像 URL (ログインのたびに更新される)。 */
  avatar_url?: string | null;
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
  /**
   * 講師表示名 (Issue #74)。 列が未マイグレーションの環境では undefined になり得るため optional。
   * null / 空文字は「未設定」 として扱い、 受講者 UI では講師を表示しない。
   */
  instructor_name?: string | null;
  status: CourseStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /**
   * 修了基準 (Issue #26)。 列が未マイグレーションの環境では undefined になり得るため optional。
   * いずれも既定 true (全レッスン完了 + 小テスト全合格 + 課題全 pass で達成、 達成で自動発行)。
   */
  require_all_lessons?: boolean;
  require_quiz_pass?: boolean;
  require_assignment_pass?: boolean;
  auto_issue_certificate?: boolean;
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

/**
 * レッスン配布資料 (lesson_materials 行 / Issue #72)。 実体は R2 上のオブジェクト。
 * R2 の `path` はサーバ内部でのみ扱い、 クライアントへは返さない
 * (ダウンロードは id ベースの `/api/materials/:id/download` プロキシ経由)。
 */
export interface LessonMaterialRow {
  id: string;
  lesson_id: string;
  file_name: string;
  size_bytes: number;
  mime_type: string;
  created_by: string | null;
  created_at: string;
}

/**
 * コース単位で引いた配布資料 (`GET /api/materials?courseId=...` / Issue #77)。
 * 一覧をレッスン・セクションでグルーピングできるよう表示名を同梱する。
 */
export interface CourseMaterialRow extends LessonMaterialRow {
  lesson_title: string;
  section_title: string;
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

/** 受講者自身の受験履歴の要約。 再訪時に「合格済み」を復元するために返す。 */
export interface LearnerQuizHistory {
  attempt_count: number;
  /** 一度でも合格していれば true。 */
  passed: boolean;
  /** 直近の受験結果 (未受験なら null)。 */
  last_score: number | null;
  last_max_score: number | null;
  last_attempt_at: string | null;
}

export interface LearnerQuiz {
  quiz: LearnerQuizConfig;
  questions: LearnerQuizQuestion[];
  history: LearnerQuizHistory;
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

/**
 * 受講者ごとの受講登録サマリ (Issue #20 / 受講登録画面の一覧バッジ用)。
 *
 * 受講登録画面は受講者を軸に選ぶため、 一覧には「何件割り当てられているか」だけあればよい。
 * enrollment 全件を取ると受講者数 × コース数に比例して膨らむので、 サーバ側で集計して返す。
 */
export interface EnrollmentSummaryRow {
  user_id: string;
  /** 割当済みコース数。 */
  total: number;
  /** 期限を過ぎていて未完了の件数。 */
  overdue: number;
}

// ---------------------------------------------------------------
// 修了判定 / 成績台帳 / 修了証 (Issue #26)
// ---------------------------------------------------------------

/** コースの修了基準トグル。 compute_course_completion / gradebook が返す。 */
export interface CompletionCriteria {
  require_all_lessons: boolean;
  require_quiz_pass: boolean;
  require_assignment_pass: boolean;
  auto_issue_certificate: boolean;
}

/**
 * (受講者, コース) の達成状況。 compute_course_completion / get_my_course_completion
 * RPC の戻り値に対応する。 進捗 + 小テスト + 課題を統合した修了判定の中核。
 */
export interface CourseCompletion {
  user_id: string;
  course_id: string;
  course_title: string;
  total_lessons: number;
  completed_lessons: number;
  total_quizzes: number;
  passed_quizzes: number;
  total_assignments: number;
  passed_assignments: number;
  criteria: CompletionCriteria;
  /** 全基準達成なら true。 修了証発行の前提。 */
  met: boolean;
  has_certificate: boolean;
  cert_code: string | null;
}

/** 成績台帳の 1 行 (受講者 × 達成状況)。 */
export interface GradebookEntry {
  user_id: string;
  display_name: string;
  initials: string | null;
  email: string | null;
  enrollment_status: EnrollmentStatus;
  due_at: string | null;
  enrolled_at: string;
  completion: CourseCompletion | null;
}

/** get_course_gradebook RPC の戻り値。 */
export interface CourseGradebook {
  course_id: string;
  course_title: string;
  criteria: CompletionCriteria;
  rows: GradebookEntry[];
}

/** 修了証 DB 行。 */
export interface CertificateRow {
  id: string;
  tenant_id: string;
  user_id: string;
  course_id: string;
  cert_code: string;
  issued_by: string | null;
  issued_at: string;
  criteria_snapshot: CourseCompletion | Record<string, unknown>;
  recipient_name: string;
  course_title: string;
  tenant_name: string;
  revoked: boolean;
}

/** issue_certificate RPC の戻り値 (サマリ)。 */
export interface IssuedCertificate {
  id: string;
  cert_code: string;
  course_id: string;
  user_id: string;
  issued_at: string;
  recipient_name: string;
  course_title: string;
  tenant_name: string;
  revoked: boolean;
  already_existed: boolean;
}

/** verify_certificate RPC (匿名実行可) の戻り値。 */
export interface CertificateVerification {
  valid: boolean;
  reason?: "not_found" | "revoked";
  cert_code?: string;
  recipient_name?: string;
  course_title?: string;
  tenant_name?: string;
  issued_at?: string;
}

// ---------------------------------------------------------------
// 分析ダッシュボード (Issue #28)
// ---------------------------------------------------------------

/** 受講推移チャートの 1 点 (月次新規登録数)。 */
export interface AnalyticsTrendPoint {
  month: string;
  label: string;
  count: number;
}

/** コース別の登録者数 n と完了率 pct。 */
export interface AnalyticsCourseCompletion {
  course_id: string;
  name: string;
  n: number;
  pct: number;
}

/** 小テストのつまずき分析 (設問ごとの正答率)。 */
export interface AnalyticsStumble {
  question_id: string;
  prompt: string;
  n: number;
  correct_pct: number;
}

/** get_tenant_analytics RPC の戻り値。 管理者ダッシュボードの KPI 一式。 */
export interface TenantAnalytics {
  active_learners: number;
  total_learners: number;
  completion_rate: number;
  certs_this_month: number;
  certs_total: number;
  avg_study_hours: number;
  new_enrollments_this_month: number;
  new_enrollments_prev_month: number;
  enrollment_trend: AnalyticsTrendPoint[];
  completion_by_course: AnalyticsCourseCompletion[];
  stumbles: AnalyticsStumble[];
  status_breakdown: { active: number; completed: number; expired: number };
  generated_at: string;
}

/** 講師ダッシュボードの受講者進捗サンプル 1 行。 */
export interface InstructorStudentProgress {
  user_id: string;
  display_name: string;
  initials: string | null;
  course_title: string;
  progress_pct: number;
  overdue: boolean;
}

/** get_instructor_overview RPC の戻り値。 */
export interface InstructorOverview {
  overdue_learners: number;
  total_learners: number;
  students: InstructorStudentProgress[];
}

// ---------------------------------------------------------------
// 通知・お知らせ (Issue #25)
// ---------------------------------------------------------------

/**
 * お知らせ (アナウンス)。 講師/管理者が発信し、 受講者ダッシュボードに表示される。
 * course_id が null ならテナント全体、 set ならそのコース受講者向け。
 * author_name は profiles の RLS を跨がず描画するための denormalize。
 */
export interface AnnouncementRow {
  id: string;
  tenant_id: string;
  course_id: string | null;
  author_id: string | null;
  author_name: string;
  title: string;
  body: string;
  published_at: string;
  created_at: string;
}

export type NotificationType = "announcement" | "review_completed" | "assignment_due";

/**
 * ユーザ個人宛のイベント通知。 本人のみ read/既読化できる。
 * お知らせの fan-out + 添削完了などのイベントを受け取る。
 * payload は種別ごとの参照情報 (submission_id / announcement_id 等)。
 */
export interface NotificationRow {
  id: string;
  user_id: string;
  tenant_id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
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
  static_analysis: {
    eslint?: { rules: Record<string, ESLintRuleConfig> };
    ast?: ASTRequirement;
  } | null;
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
  /** 講師表示名 (`courses.instructor_name` 由来)。 未設定なら省略される。 */
  enrolledBy?: string;
  dueAt?: string | null;
  /** 受講登録 (Issue #20) 由来。 必須 / 任意の区別。 */
  required?: boolean;
  description?: string;
  completed?: boolean;
  sections?: UiSection[];
  /** 修了基準 (CourseRow の require_* フラグ由来)。 受講者 UI の「修了条件」表示に使う。 */
  criteria?: {
    requireAllLessons: boolean;
    requireQuizPass: boolean;
    requireAssignmentPass: boolean;
  };
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

export function mapSectionRowToUi(row: SectionRow, lessons: LessonRow[]): UiSection {
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
  // 空文字も「未設定」 とみなし、 キーごと落として UI 側の分岐を単純にする。
  const instructorName = input.course.instructor_name?.trim();
  return {
    id: input.course.id,
    title: input.course.title,
    category: input.course.category ?? "",
    color: input.course.color ?? "indigo",
    ...(input.course.duration_hours != null ? { duration: input.course.duration_hours } : {}),
    lessonsCount,
    progress: 0,
    ...(instructorName ? { enrolledBy: instructorName } : {}),
    ...(input.course.description != null ? { description: input.course.description } : {}),
    sections,
    criteria: {
      requireAllLessons: input.course.require_all_lessons ?? true,
      requireQuizPass: input.course.require_quiz_pass ?? true,
      requireAssignmentPass: input.course.require_assignment_pass ?? true,
    },
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
      throw new Error(`Assignment ${row.id} has test_kind=${row.test_kind} but no mutation config`);
    }
    return { ...base, testKind: row.test_kind, mutation: row.mutation };
  }
  return { ...base, testKind: row.test_kind };
}
