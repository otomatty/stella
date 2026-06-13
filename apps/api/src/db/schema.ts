/**
 * Drizzle スキーマ — Neon Postgres (Supabase からの移行 / #neon)。
 *
 * 旧 `supabase/migrations/*.sql` の DDL を Drizzle 定義へ移植したもの。
 * 主な差分:
 *   - `auth.users` への参照を廃止。 ユーザー ID は Neon Auth が発行する文字列 (text)。
 *     `profiles.id` が Neon Auth ユーザー ID を保持する正準テーブルになる。
 *   - RLS / SECURITY DEFINER 関数は廃止し、 認可は Hono アプリ層 (`lib/authz.ts`) で行う。
 *   - `current_tenant_id()` / `current_role()` 相当はリクエストごとの caller profile で代替。
 *
 * snake_case 列名は既存の DB 行型 (`@falcon/shared/cms/types`) と一致させ、
 * フロント側のマッパーを変更せずに済むようにしている。
 */

import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const now = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------
// テナント / プロフィール (旧 cms_foundation)
// ---------------------------------------------------------------

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  subtitle: text("subtitle"),
  icon: text("icon"),
  activeCount: integer("active_count").notNull().default(0),
  // 組織マスタ (Issue #29) 拡張列。
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  planSeats: integer("plan_seats"),
  contractStart: date("contract_start"),
  contractEnd: date("contract_end"),
  active: boolean("active").notNull().default(true),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  // Neon Auth が発行するユーザー ID (text)。 旧 auth.users(id) の置き換え。
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
  disabled: boolean("disabled").notNull().default(false),
  createdAt: now(),
});

// ---------------------------------------------------------------
// コース / セクション / レッスン / 課題
// ---------------------------------------------------------------

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
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
  requireAllLessons: boolean("require_all_lessons").notNull().default(true),
  requireQuizPass: boolean("require_quiz_pass").notNull().default(true),
  requireAssignmentPass: boolean("require_assignment_pass").notNull().default(true),
  autoIssueCertificate: boolean("auto_issue_certificate").notNull().default(true),
  createdBy: text("created_by"),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sections = pgTable("sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: now(),
});

export const assignments = pgTable("assignments", {
  // id は @falcon/shared 由来の text id (uuid ではない)。
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
  starterFiles: jsonb("starter_files").notNull().default([]),
  entryFile: text("entry_file"),
  entryPoints: jsonb("entry_points"),
  tests: jsonb("tests").notNull().default([]),
  sqlSeed: text("sql_seed"),
  lintPreset: jsonb("lint_preset"),
  staticAnalysis: jsonb("static_analysis"),
  mutation: jsonb("mutation"),
  demoCall: text("demo_call"),
  createdBy: text("created_by"),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lessons = pgTable("lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  sectionId: uuid("section_id")
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
  // assignment_id は text (assignments.id と同じく @falcon/shared 由来)。 FK にはしない。
  assignmentId: text("assignment_id"),
  totalPages: integer("total_pages"),
  totalSec: integer("total_sec"),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------
// レッスン進捗 (旧 lesson_progress)
// ---------------------------------------------------------------

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull(),
    completed: boolean("completed").notNull().default(false),
    lastPage: integer("last_page"),
    viewedPages: jsonb("viewed_pages").notNull().default([]),
    watchedSec: doublePrecision("watched_sec"),
    // クライアント付与の更新時刻 (端末間 Last-Write-Wins に使う)。
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userLessonUnique: uniqueIndex("lesson_progress_user_lesson_uq").on(
      t.userId,
      t.lessonId,
    ),
  }),
);

// ---------------------------------------------------------------
// 小テスト (旧 quizzes / quiz_questions / quiz_options / quiz_attempts)
// ---------------------------------------------------------------

export const quizzes = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  passScore: integer("pass_score").notNull().default(70),
  timeLimitSec: integer("time_limit_sec"),
  shuffleQuestions: boolean("shuffle_questions").notNull().default(false),
  shuffleOptions: boolean("shuffle_options").notNull().default(false),
  maxAttempts: integer("max_attempts"),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["single", "multiple", "boolean"] }).notNull(),
  prompt: text("prompt").notNull().default(""),
  explanation: text("explanation"),
  points: integer("points").notNull().default(1),
  order: integer("order").notNull().default(0),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quizOptions = pgTable("quiz_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => quizQuestions.id, { onDelete: "cascade" }),
  label: text("label").notNull().default(""),
  isCorrect: boolean("is_correct").notNull().default(false),
  order: integer("order").notNull().default(0),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull(),
  passed: boolean("passed").notNull(),
  answers: jsonb("answers").notNull().default([]),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------
// 受講登録 (旧 enrollments)
// ---------------------------------------------------------------

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    assignedBy: text("assigned_by"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    required: boolean("required").notNull().default(false),
    status: text("status", { enum: ["active", "completed", "expired"] })
      .notNull()
      .default("active"),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    userCourseUnique: uniqueIndex("enrollments_user_course_uq").on(
      t.userId,
      t.courseId,
    ),
  }),
);

// ---------------------------------------------------------------
// Q&A (旧 questions / question_replies)
// ---------------------------------------------------------------

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").notNull(),
  lessonId: uuid("lesson_id"),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  authorInitials: text("author_initials"),
  title: text("title").notNull().default(""),
  body: text("body").notNull(),
  status: text("status", { enum: ["open", "answered", "closed"] })
    .notNull()
    .default("open"),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questionReplies = pgTable("question_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  authorInitials: text("author_initials"),
  body: text("body").notNull(),
  isInstructor: boolean("is_instructor").notNull().default(false),
  createdAt: now(),
});

// ---------------------------------------------------------------
// 通知 / お知らせ (旧 announcements / notifications)
// ---------------------------------------------------------------

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  courseId: uuid("course_id"),
  authorId: text("author_id"),
  authorName: text("author_name").notNull().default(""),
  title: text("title").notNull().default(""),
  body: text("body").notNull().default(""),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: now(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
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
  payload: jsonb("payload").notNull().default({}),
  read: boolean("read").notNull().default(false),
  createdAt: now(),
});

// ---------------------------------------------------------------
// 課題提出 / 添削 (旧 submissions)
// ---------------------------------------------------------------

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  studentId: text("student_id"),
  lessonId: uuid("lesson_id"),
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
  aiReady: boolean("ai_ready").notNull().default(false),
  aiSuggestions: jsonb("ai_suggestions").notNull().default([]),
  rubric: jsonb("rubric").notNull().default([]),
  reviewNotes: text("review_notes").notNull().default(""),
  verdict: text("verdict", { enum: ["pass", "resubmit", "fail"] }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewerId: text("reviewer_id"),
});

// ---------------------------------------------------------------
// 修了証 (旧 certificates)
// ---------------------------------------------------------------

export const certificates = pgTable("certificates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  certCode: text("cert_code").notNull().unique(),
  issuedBy: text("issued_by"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  criteriaSnapshot: jsonb("criteria_snapshot").notNull().default({}),
  recipientName: text("recipient_name").notNull(),
  courseTitle: text("course_title").notNull(),
  tenantName: text("tenant_name").notNull(),
  revoked: boolean("revoked").notNull().default(false),
});

// ---------------------------------------------------------------
// 監査ログ (旧 audit_logs)
// ---------------------------------------------------------------

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull(),
  actorId: text("actor_id"),
  actorName: text("actor_name").notNull().default(""),
  actorRole: text("actor_role"),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  ip: text("ip"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: now(),
});
