/**
 * Drizzle スキーマ — Cloudflare D1 (SQLite)。
 *
 * 旧 Neon Postgres スキーマを SQLite 向けに移植。 snake_case 列名は
 * `@falcon/shared/cms/types` の行型と一致させ、 フロントのマッパーは無変更。
 *
 * 認可は Hono アプリ層 (`lib/authz.ts`) で行う。
 */

import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const uuid = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const tsNow = (name: string) => ts(name).notNull().$defaultFn(() => new Date());
const tsNowUpd = (name: string) =>
  ts(name)
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());
const json = <T>(name: string, fallback: T) =>
  text(name, { mode: "json" }).$type<T>().notNull().default(fallback);

// ---------------------------------------------------------------
// 認証 (Workers 自前 Google OAuth / JWT)
// ---------------------------------------------------------------

export const authUsers = sqliteTable("auth_users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  createdAt: tsNow("created_at"),
});

export const authOtpCodes = sqliteTable("auth_otp_codes", {
  email: text("email").primaryKey(),
  codeHash: text("code_hash").notNull(),
  expiresAt: ts("expires_at").notNull(),
});

// ---------------------------------------------------------------
// テナント / プロフィール
// ---------------------------------------------------------------

export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  subtitle: text("subtitle"),
  icon: text("icon"),
  activeCount: integer("active_count").notNull().default(0),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  planSeats: integer("plan_seats"),
  contractStart: text("contract_start"),
  contractEnd: text("contract_end"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: tsNow("created_at"),
  updatedAt: tsNowUpd("updated_at"),
});

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["student", "instructor", "admin"] })
    .notNull()
    .default("student"),
  displayName: text("display_name").notNull(),
  initials: text("initials"),
  email: text("email"),
  disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
  createdAt: tsNow("created_at"),
});

// ---------------------------------------------------------------
// コース / セクション / レッスン / 課題
// ---------------------------------------------------------------

export const courses = sqliteTable(
  "courses",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    category: text("category"),
    color: text("color", { enum: ["indigo", "green", "amber", "slate"] }),
    durationHours: integer("duration_hours"),
    description: text("description"),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    requireAllLessons: integer("require_all_lessons", { mode: "boolean" })
      .notNull()
      .default(true),
    requireQuizPass: integer("require_quiz_pass", { mode: "boolean" }).notNull().default(true),
    requireAssignmentPass: integer("require_assignment_pass", { mode: "boolean" })
      .notNull()
      .default(true),
    autoIssueCertificate: integer("auto_issue_certificate", { mode: "boolean" })
      .notNull()
      .default(true),
    createdBy: text("created_by"),
    createdAt: tsNow("created_at"),
    updatedAt: tsNowUpd("updated_at"),
  },
  (t) => ({
    tenantSlugUnique: uniqueIndex("courses_tenant_slug_uq").on(t.tenantId, t.slug),
  }),
);

export const sections = sqliteTable("sections", {
  id: uuid(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: tsNow("created_at"),
});

export const assignments = sqliteTable("assignments", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  stage: text("stage").notNull(),
  chapterId: text("chapter_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  language: text("language").notNull(),
  testKind: text("test_kind").notNull(),
  starterFiles: json<unknown[]>("starter_files", []),
  entryFile: text("entry_file"),
  entryPoints: text("entry_points", { mode: "json" }).$type<unknown | null>(),
  tests: json<unknown[]>("tests", []),
  sqlSeed: text("sql_seed"),
  lintPreset: text("lint_preset", { mode: "json" }).$type<unknown | null>(),
  staticAnalysis: text("static_analysis", { mode: "json" }).$type<unknown | null>(),
  mutation: text("mutation", { mode: "json" }).$type<unknown | null>(),
  demoCall: text("demo_call"),
  createdBy: text("created_by"),
  createdAt: tsNow("created_at"),
  updatedAt: tsNowUpd("updated_at"),
});

export const lessons = sqliteTable("lessons", {
  id: uuid(),
  sectionId: text("section_id")
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type", {
    enum: ["video", "slides", "text", "quiz", "assignment", "code"],
  }).notNull(),
  order: integer("order").notNull().default(0),
  durationLabel: text("duration_label"),
  videoPath: text("video_path"),
  pdfPath: text("pdf_path"),
  markdown: text("markdown"),
  assignmentId: text("assignment_id"),
  totalPages: integer("total_pages"),
  totalSec: integer("total_sec"),
  createdAt: tsNow("created_at"),
  updatedAt: tsNowUpd("updated_at"),
});

// ---------------------------------------------------------------
// レッスン進捗
// ---------------------------------------------------------------

export const lessonProgress = sqliteTable(
  "lesson_progress",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull(),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    lastPage: integer("last_page"),
    viewedPages: json<number[]>("viewed_pages", []),
    watchedSec: real("watched_sec"),
    updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => ({
    userLessonUnique: uniqueIndex("lesson_progress_user_lesson_uq").on(t.userId, t.lessonId),
  }),
);

// ---------------------------------------------------------------
// 小テスト
// ---------------------------------------------------------------

export const quizzes = sqliteTable("quizzes", {
  id: uuid(),
  lessonId: text("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  passScore: integer("pass_score").notNull().default(70),
  timeLimitSec: integer("time_limit_sec"),
  shuffleQuestions: integer("shuffle_questions", { mode: "boolean" }).notNull().default(false),
  shuffleOptions: integer("shuffle_options", { mode: "boolean" }).notNull().default(false),
  maxAttempts: integer("max_attempts"),
  createdAt: tsNow("created_at"),
  updatedAt: tsNowUpd("updated_at"),
});

export const quizQuestions = sqliteTable("quiz_questions", {
  id: uuid(),
  quizId: text("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["single", "multiple", "boolean"] }).notNull(),
  prompt: text("prompt").notNull().default(""),
  explanation: text("explanation"),
  points: integer("points").notNull().default(1),
  order: integer("order").notNull().default(0),
  createdAt: tsNow("created_at"),
  updatedAt: tsNowUpd("updated_at"),
});

export const quizOptions = sqliteTable("quiz_options", {
  id: uuid(),
  questionId: text("question_id")
    .notNull()
    .references(() => quizQuestions.id, { onDelete: "cascade" }),
  label: text("label").notNull().default(""),
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull().default(false),
  order: integer("order").notNull().default(0),
});

export const quizAttempts = sqliteTable("quiz_attempts", {
  id: uuid(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  quizId: text("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull(),
  passed: integer("passed", { mode: "boolean" }).notNull(),
  answers: json<unknown[]>("answers", []),
  submittedAt: tsNow("submitted_at"),
});

// ---------------------------------------------------------------
// 受講登録
// ---------------------------------------------------------------

export const enrollments = sqliteTable(
  "enrollments",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    assignedBy: text("assigned_by"),
    dueAt: ts("due_at"),
    required: integer("required", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: ["active", "completed", "expired"] })
      .notNull()
      .default("active"),
    enrolledAt: tsNow("enrolled_at"),
    completedAt: ts("completed_at"),
  },
  (t) => ({
    userCourseUnique: uniqueIndex("enrollments_user_course_uq").on(t.userId, t.courseId),
  }),
);

// ---------------------------------------------------------------
// Q&A
// ---------------------------------------------------------------

export const questions = sqliteTable("questions", {
  id: uuid(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull(),
  lessonId: text("lesson_id"),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  authorInitials: text("author_initials"),
  title: text("title").notNull().default(""),
  body: text("body").notNull(),
  status: text("status", { enum: ["open", "answered", "closed"] })
    .notNull()
    .default("open"),
  createdAt: tsNow("created_at"),
  updatedAt: tsNowUpd("updated_at"),
});

export const questionReplies = sqliteTable("question_replies", {
  id: uuid(),
  questionId: text("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  authorInitials: text("author_initials"),
  body: text("body").notNull(),
  isInstructor: integer("is_instructor", { mode: "boolean" }).notNull().default(false),
  createdAt: tsNow("created_at"),
});

// ---------------------------------------------------------------
// 通知 / お知らせ
// ---------------------------------------------------------------

export const announcements = sqliteTable("announcements", {
  id: uuid(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  courseId: text("course_id"),
  authorId: text("author_id"),
  authorName: text("author_name").notNull().default(""),
  title: text("title").notNull().default(""),
  body: text("body").notNull().default(""),
  publishedAt: tsNow("published_at"),
  createdAt: tsNow("created_at"),
});

export const notifications = sqliteTable("notifications", {
  id: uuid(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["announcement", "review_completed", "qa_answered", "assignment_due"],
  }).notNull(),
  title: text("title").notNull().default(""),
  body: text("body").notNull().default(""),
  payload: json<Record<string, unknown>>("payload", {}),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: tsNow("created_at"),
});

// ---------------------------------------------------------------
// 課題提出 / 添削
// ---------------------------------------------------------------

export const submissions = sqliteTable("submissions", {
  id: uuid(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  studentId: text("student_id"),
  lessonId: text("lesson_id"),
  assignmentId: text("assignment_id"),
  courseTitle: text("course_title").notNull(),
  sectionTitle: text("section_title"),
  assignmentTitle: text("assignment_title").notNull(),
  code: text("code").notNull(),
  status: text("status", {
    enum: ["pending", "passed", "resubmit", "failed"],
  })
    .notNull()
    .default("pending"),
  priority: text("priority", { enum: ["high", "normal", "low"] })
    .notNull()
    .default("normal"),
  attempt: integer("attempt").notNull().default(1),
  aiReady: integer("ai_ready", { mode: "boolean" }).notNull().default(false),
  aiSuggestions: json<unknown[]>("ai_suggestions", []),
  rubric: json<unknown[]>("rubric", []),
  reviewNotes: text("review_notes").notNull().default(""),
  verdict: text("verdict", { enum: ["pass", "resubmit", "fail"] }),
  submittedAt: tsNow("submitted_at"),
  reviewedAt: ts("reviewed_at"),
  reviewerId: text("reviewer_id"),
});

// ---------------------------------------------------------------
// 修了証
// ---------------------------------------------------------------

export const certificates = sqliteTable("certificates", {
  id: uuid(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  certCode: text("cert_code").notNull().unique(),
  issuedBy: text("issued_by"),
  issuedAt: tsNow("issued_at"),
  criteriaSnapshot: json<Record<string, unknown>>("criteria_snapshot", {}),
  recipientName: text("recipient_name").notNull(),
  courseTitle: text("course_title").notNull(),
  tenantName: text("tenant_name").notNull(),
  revoked: integer("revoked", { mode: "boolean" }).notNull().default(false),
});

// ---------------------------------------------------------------
// 監査ログ
// ---------------------------------------------------------------

export const auditLogs = sqliteTable("audit_logs", {
  id: uuid(),
  tenantId: text("tenant_id").notNull(),
  actorId: text("actor_id"),
  actorName: text("actor_name").notNull().default(""),
  actorRole: text("actor_role"),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  ip: text("ip"),
  metadata: json<Record<string, unknown>>("metadata", {}),
  createdAt: tsNow("created_at"),
});

/** D1 smoke 用テーブル名一覧 (auth 含む 21)。 */
export const APP_TABLES = [
  "auth_users",
  "auth_otp_codes",
  "tenants",
  "profiles",
  "courses",
  "sections",
  "lessons",
  "assignments",
  "lesson_progress",
  "quizzes",
  "quiz_questions",
  "quiz_options",
  "quiz_attempts",
  "enrollments",
  "questions",
  "question_replies",
  "announcements",
  "notifications",
  "submissions",
  "certificates",
  "audit_logs",
] as const;

export const TABLE_COUNT = APP_TABLES.length;
