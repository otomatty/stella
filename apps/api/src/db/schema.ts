/**
 * Drizzle スキーマ — Cloudflare D1 (SQLite)。
 *
 * 旧 Neon Postgres スキーマを SQLite 向けに移植。 snake_case 列名は
 * `@falcon/shared/cms/types` の行型と一致させ、 フロントのマッパーは無変更。
 *
 * 認可は Hono アプリ層 (`lib/authz.ts`) で行う。
 */

import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const uuid = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const tsNow = (name: string) =>
  ts(name)
    .notNull()
    .$defaultFn(() => new Date());
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
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  createdAt: tsNow("created_at"),
});

export const authOtpCodes = sqliteTable("auth_otp_codes", {
  email: text("email").primaryKey(),
  codeHash: text("code_hash").notNull(),
  expiresAt: ts("expires_at").notNull(),
});

export const authVscodeLinks = sqliteTable("auth_vscode_links", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  codeHash: text("code_hash").notNull().unique(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: tsNow("created_at"),
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
  // テストモード (管理画面から切替)。 ON のとき招待 (ユーザー登録) 時にテストデータを投入する。
  testMode: integer("test_mode", { mode: "boolean" }).notNull().default(false),
  createdAt: tsNow("created_at"),
  updatedAt: tsNowUpd("updated_at"),
});

export const profiles = sqliteTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: ["student", "instructor", "admin", "platform_admin"],
    })
      .notNull()
      .default("student"),
    displayName: text("display_name").notNull(),
    /**
     * display_name の出所。 招待時は "invite" (メールのローカル部) で作られ、 Google ログイン時に
     * ID トークンの name で "google" へ上書きされる。 本人が設定画面で変更すると "user" になり、
     * 以後 Google 名では上書きしない。
     */
    nameSource: text("name_source", { enum: ["invite", "google", "user"] })
      .notNull()
      .default("invite"),
    initials: text("initials"),
    /** Google アカウントのプロフィール画像 URL。 ログインのたびに最新化する。 */
    avatarUrl: text("avatar_url"),
    email: text("email"),
    disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
    createdAt: tsNow("created_at"),
  },
  (t) => ({
    emailUnique: uniqueIndex("profiles_email_uq").on(t.email),
  }),
);

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
    /**
     * 一覧カードのサムネイル画像の R2 キー。教材リポジトリ (`packages/content`) の
     * `courses/<slug>/thumbnail.*` を seed が書き込む。null ならストライプ表示。
     */
    thumbnailPath: text("thumbnail_path"),
    durationHours: integer("duration_hours"),
    description: text("description"),
    /** 講師表示名 (Issue #74)。 未設定 (null / 空) のコースは受講者 UI で講師を表示しない。 */
    instructorName: text("instructor_name"),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    requireAllLessons: integer("require_all_lessons", { mode: "boolean" }).notNull().default(true),
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
// レッスン配布資料 (Issue #72)
// ---------------------------------------------------------------

/**
 * レッスンに紐づく配布資料。 実体は R2 (`MATERIALS_BUCKET`) 上のオブジェクトで、
 * `path` は `tenant/{tenantId}/lessons/{lessonId}/...` 形式。
 * テナントはレッスン → セクション → コースの join で解決する (authz はアプリ層)。
 */
export const lessonMaterials = sqliteTable("lesson_materials", {
  id: uuid(),
  lessonId: text("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  fileName: text("file_name").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  mimeType: text("mime_type").notNull().default("application/octet-stream"),
  createdBy: text("created_by"),
  createdAt: tsNow("created_at"),
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
    updatedAt: ts("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    userLessonUnique: uniqueIndex("lesson_progress_user_lesson_uq").on(t.userId, t.lessonId),
  }),
);

// ---------------------------------------------------------------
// 学習アクティビティ (日別ログ / Issue #73)
// ---------------------------------------------------------------

/**
 * 受講者の日別学習ログ。 `lesson_progress` はレッスンごとの最終状態しか持たないため、
 * 週間チャート / 連続学習ストリークを実データで出すためのログをここに積む。
 *
 * `date` はアプリ基準 TZ (Asia/Tokyo) の `YYYY-MM-DD`。 進捗 upsert のたびに
 * サーバ側で当日分を加算 upsert する (差分のみ加算 — `lib/study-activity.ts`)。
 */
export const studyActivity = sqliteTable(
  "study_activity",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    watchedSec: real("watched_sec").notNull().default(0),
    completedLessons: integer("completed_lessons").notNull().default(0),
    createdAt: tsNow("created_at"),
    updatedAt: tsNowUpd("updated_at"),
  },
  (t) => ({
    userDateUnique: uniqueIndex("study_activity_user_date_uq").on(t.userId, t.date),
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
    /**
     * この登録を **作った** 割当プリセット (`enrollment_presets.id`)。 手動割当なら null。
     *
     * 記録するのは出自であって 「今の期限 / 必須がプリセット由来か」 ではない。 あとから期限を
     * 手で直しても消さない。 消してしまうと 「このプリセットで登録した受講生」 の集合が
     * 個別調整のたびに欠け、 差分適用 (プリセットに後から足した教材を適用済みの受講生へ配る)
     * の足場が崩れるため。 画面のバッジもこの意味で表示する。
     *
     * FK は張らない: プリセット側は物理削除せず `archived` で退役させる運用なので参照は切れず、
     * 実データの入った `enrollments` を FK 追加のためにテーブル再作成したくないため。
     */
    presetId: text("preset_id"),
    /**
     * `preset_id` のプリセットでこの登録が作られた時刻。
     *
     * あとから別のプリセットを被せても、 手で期限を直しても更新しない。 「今の値の出どころ」
     * ではなく出自を表す列なので、 上書きすると `preset_id` と意味がずれる。
     */
    presetAppliedAt: ts("preset_applied_at"),
    enrolledAt: tsNow("enrolled_at"),
    completedAt: ts("completed_at"),
  },
  (t) => ({
    userCourseUnique: uniqueIndex("enrollments_user_course_uq").on(t.userId, t.courseId),
  }),
);

// ---------------------------------------------------------------
// 割当プリセット (受講登録のテンプレート)
// ---------------------------------------------------------------

/**
 * 「新入社員パック」 のように、 受講登録の組み合わせに名前を付けて保存したもの。
 *
 * 適用は 「その場で enrollments へ展開して終わり」 のスナップショット方式。 プリセットを
 * あとから編集しても、 適用済みの受講登録は追随しない (差分適用は `enrollments.preset_id`
 * を手掛かりに後から足せる)。 動的グループにすると、 教材を外したときの伝播や個別に
 * 伸ばした期限の扱いが一気に増えるため、 まずは展開して切り離す。
 */
export const enrollmentPresets = sqliteTable(
  "enrollment_presets",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    /**
     * 退役フラグ。 使用中のプリセットを物理削除すると監査ログの `preset_id` が
     * 参照先を失うため、 削除 API はこの列を立てるだけにする。
     */
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    createdBy: text("created_by"),
    createdAt: tsNow("created_at"),
    updatedAt: tsNowUpd("updated_at"),
  },
  (t) => ({
    // 同じ名前が並ぶと適用時に選び間違えるため、 テナント内で一意にする。
    //
    // ただし **退役していないものに限る** 部分インデックスにする。 削除は `archived` を立てる
    // 論理削除なので、 無条件の一意制約だと消した名前が永久に予約され、 同じ名前で作り直せない
    // (画面上は削除したのに 409 になる)。
    tenantNameUnique: uniqueIndex("enrollment_presets_tenant_name_uq")
      .on(t.tenantId, t.name)
      .where(sql`${t.archived} = 0`),
  }),
);

/**
 * プリセットに含まれる教材 1 件。
 *
 * 期限は絶対日付ではなく `due_offset_days` (基準日からの日数) で持つ。 絶対日付を焼き込むと
 * 4 月に作ったプリセットが 7 月には腐り、 適用のたびに手で直すことになる。
 */
export const enrollmentPresetItems = sqliteTable(
  "enrollment_preset_items",
  {
    id: uuid(),
    presetId: text("preset_id")
      .notNull()
      .references(() => enrollmentPresets.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    required: integer("required", { mode: "boolean" }).notNull().default(true),
    /** 基準日からの日数。 null なら期限なし。 */
    dueOffsetDays: integer("due_offset_days"),
    /** 表示順 (学習してほしい順序の意図を残す)。 */
    order: integer("order").notNull().default(0),
  },
  (t) => ({
    presetCourseUnique: uniqueIndex("enrollment_preset_items_preset_course_uq").on(
      t.presetId,
      t.courseId,
    ),
  }),
);

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
    enum: ["announcement", "review_completed", "assignment_due"],
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

export const certificates = sqliteTable(
  "certificates",
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
    certCode: text("cert_code").notNull().unique(),
    issuedBy: text("issued_by"),
    issuedAt: tsNow("issued_at"),
    criteriaSnapshot: json<Record<string, unknown>>("criteria_snapshot", {}),
    recipientName: text("recipient_name").notNull(),
    courseTitle: text("course_title").notNull(),
    tenantName: text("tenant_name").notNull(),
    revoked: integer("revoked", { mode: "boolean" }).notNull().default(false),
  },
  (t) => ({
    // 1 ユーザー 1 コースにつき 1 通。 発行 API はこの制約を前提に
    // `onConflictDoNothing` で競合時のべき等性を担保する (制約が無いと D1 が
    // "ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint" で
    // 落ち、 修了証発行が常に 500 になる)。
    userCourseUnique: uniqueIndex("certificates_user_course_uq").on(t.userId, t.courseId),
  }),
);

// ---------------------------------------------------------------
// 面談対策 (Interview Prep)
// ---------------------------------------------------------------

/**
 * 面談対策の想定質問バンク。 正本はリポジトリの
 * `packages/shared/src/interview/questions.json` で、 seed が upsert/prune する
 * (教材コースと同じ運用 — CMS 編集 UI は無い)。
 */
export const interviewQuestions = sqliteTable(
  "interview_questions",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    no: integer("no").notNull(),
    /**
     * 旧・単一カテゴリ。 本番のデプロイ順が migrate → seed → deploy:api → deploy:web で、
     * 移行中は旧 Worker / 旧バンドルがまだこの列を読む。 全環境が categories へ移った
     * 次のリリースで削除する (drop 用のマイグレーションを別 PR で追加すること)。
     */
    category: text("category").notNull(),
    categories: json<string[]>("categories", []),
    subcategory: text("subcategory").notNull(),
    freq: text("freq", { enum: ["A", "B", "C"] }).notNull(),
    question: text("question").notNull(),
    time: text("time"),
    keywords: text("keywords"),
    intent: text("intent"),
    answerTemplate: text("answer_template"),
    deep1: text("deep1"),
    deep2: text("deep2"),
    deep3: text("deep3"),
    ng: text("ng"),
    criteria: text("criteria"),
    isReverse: integer("is_reverse", { mode: "boolean" }).notNull().default(false),
    createdAt: tsNow("created_at"),
    updatedAt: tsNowUpd("updated_at"),
  },
  (t) => ({
    tenantNoUnique: uniqueIndex("interview_questions_tenant_no_uq").on(t.tenantId, t.no),
  }),
);

/** 受講者ごとの面談対策カテゴリ割当。 共通カテゴリは割当に含めず常時表示。 */
export const interviewPrepAssignments = sqliteTable(
  "interview_prep_assignments",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    categories: json<string[]>("categories", []),
    assignedBy: text("assigned_by"),
    updatedAt: tsNowUpd("updated_at"),
  },
  (t) => ({
    tenantProfileUnique: uniqueIndex("interview_prep_assignments_tenant_profile_uq").on(
      t.tenantId,
      t.profileId,
    ),
  }),
);

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

// ---------------------------------------------------------------
// サポート問い合わせ (ログイン不要フォーム)
// ---------------------------------------------------------------

/**
 * サポート問い合わせ。 ログイン画面「サポート」リンク先の公開フォームから投稿される。
 * 未ログインでも投稿できるため tenant / user は任意 (ログイン中のみ user_id を記録)。
 */
export const supportInquiries = sqliteTable("support_inquiries", {
  id: uuid(),
  name: text("name").notNull().default(""),
  email: text("email").notNull(),
  category: text("category", {
    enum: ["login", "account", "billing", "bug", "other"],
  })
    .notNull()
    .default("other"),
  message: text("message").notNull(),
  status: text("status", { enum: ["open", "closed"] })
    .notNull()
    .default("open"),
  userId: text("user_id"),
  createdAt: tsNow("created_at"),
});

/** D1 smoke 用テーブル名一覧 (auth 含む)。 */
export const APP_TABLES = [
  "auth_users",
  "auth_otp_codes",
  "auth_vscode_links",
  "tenants",
  "profiles",
  "courses",
  "sections",
  "lessons",
  "lesson_materials",
  "assignments",
  "lesson_progress",
  "study_activity",
  "quizzes",
  "quiz_questions",
  "quiz_options",
  "quiz_attempts",
  "enrollments",
  "enrollment_presets",
  "enrollment_preset_items",
  "announcements",
  "notifications",
  "submissions",
  "certificates",
  "audit_logs",
  "support_inquiries",
  "interview_questions",
  "interview_prep_assignments",
] as const;

export const TABLE_COUNT = APP_TABLES.length;
