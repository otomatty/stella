/**
 * Drizzle スキーマ — Cloudflare D1 (SQLite)。
 *
 * 旧 Neon Postgres スキーマを SQLite 向けに移植。 snake_case 列名は
 * `@falcon/shared/cms/types` の行型と一致させ、 フロントのマッパーは無変更。
 *
 * 認可は Hono アプリ層 (`lib/authz.ts`) で行う。
 */

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { DiscoveryQuestion } from "@falcon/shared/discovery/types";
import { EMPTY_HOF_CHAPTERS } from "@falcon/shared/hall-of-fame/types";
import type { HallOfFameChapters, HallOfFamePathStage } from "@falcon/shared/hall-of-fame/types";
import type { SkillSheetV1 } from "@falcon/shared/skill-sheet/types";

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
      enum: ["student", "instructor", "admin", "platform_admin", "sales"],
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
// ステージ / セクション / レッスン / 課題
// ---------------------------------------------------------------

export const stages = sqliteTable(
  "stages",
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
    /**
     * 前提ステージの **slug** の JSON 配列文字列 (`["html-css-basics"]`)。null / 空配列は
     * 前提なし。すべてクリアするまでこのステージは開けない (スキルツリーのハードロック)。
     *
     * UUID ではなく slug を入れる: 正本は教材リポジトリ (`courses/<slug>/course.json`) で、
     * そちらは stage UUID を知らない。評価器 (`@falcon/shared/skill-map`) も slug で解く。
     * `json()` ヘルパを使わないのは、既存行に既定値を入れずに null のまま足したいため。
     */
    prerequisites: text("prerequisites"),
    /** 到達説明。「この星をともした人は◯◯ができる」のホバー表示に使う 1 文。 */
    canDo: text("can_do"),
    /** 霧の中の星に見せるテーマ名。視界外のステージはタイトルの代わりにこれだけを出す。 */
    theme: text("theme"),
    /** 講師表示名 (Issue #74)。 未設定 (null / 空) のステージは受講者 UI で講師を表示しない。 */
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
    tenantSlugUnique: uniqueIndex("stages_tenant_slug_uq").on(t.tenantId, t.slug),
  }),
);

export const sections = sqliteTable("sections", {
  id: uuid(),
  stageId: text("stage_id")
    .notNull()
    .references(() => stages.id, { onDelete: "cascade" }),
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
 * テナントはレッスン → セクション → ステージの join で解決する (authz はアプリ層)。
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
  /** upload = 手動アップロード / auto = CI が教材から生成した PDF。auto 行はレッスンに
   *  つき最新版 1 行で、履歴は lesson_material_versions が持つ。 */
  source: text("source", { enum: ["upload", "auto"] })
    .notNull()
    .default("upload"),
  createdBy: text("created_by"),
  createdAt: tsNow("created_at"),
});

/**
 * 配布資料の版履歴 (教材 PDF 自動生成 — docs/superpowers/specs/2026-08-26-material-pdf-auto-conversion-design.md)。
 * R2 のオブジェクトは版ごとに不変キー (`lesson-pdf/.../<sourceHash>.pdf`) で全版残し、
 * この表が「何版がどのキーか」を持つ。受講者へは lesson_materials の最新 path のみ、
 * staff は任意の版をダウンロードできる。
 */
export const lessonMaterialVersions = sqliteTable(
  "lesson_material_versions",
  {
    materialId: text("material_id")
      .notNull()
      .references(() => lessonMaterials.id, { onDelete: "cascade" }),
    /** 資料内の連番 (1..)。内容ハッシュが変わったときだけ増える。 */
    version: integer("version").notNull(),
    path: text("path").notNull(),
    /** 生成元 (本文 + 参照アセット + ジェネレータ版) の内容ハッシュ。 */
    sourceHash: text("source_hash").notNull(),
    /** 生成元となった lesson_revisions.revision (同一レッスン内)。 */
    lessonRevision: integer("lesson_revision"),
    sizeBytes: integer("size_bytes").notNull().default(0),
    createdAt: tsNow("created_at"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.materialId, t.version] }),
  }),
);

/**
 * 教材本文のリビジョン履歴 (バージョン管理の新仕様)。
 * seed (GitHub 正本) と CMS 編集の両方が、本文が変わったときだけ 1 行積む。
 * markdown はスナップショット全文 — quiz レッスンは本文列を持たないため、
 * 生成元 practice.md の全文を入れる。
 */
export const lessonRevisions = sqliteTable(
  "lesson_revisions",
  {
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    /** レッスン内の連番 (1..)。 */
    revision: integer("revision").notNull(),
    /** markdown スナップショットの SHA-256 (hex)。直前リビジョンとの同一判定に使う。 */
    sourceHash: text("source_hash").notNull(),
    markdown: text("markdown"),
    source: text("source", { enum: ["seed", "cms"] })
      .notNull()
      .default("seed"),
    /** cms のときの編集者 profile id。seed は null。 */
    createdBy: text("created_by"),
    createdAt: tsNow("created_at"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.lessonId, t.revision] }),
  }),
);

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
// 学習経路の記録 (スキルツリーの統計 / Phase 1)
// ---------------------------------------------------------------

/**
 * 「どの星をいつ点けたか」の追記ログ。受講開始 (`started`) とクリア (`cleared`) だけを積む。
 *
 * **進捗の正本ではない** — 状態の正本は `enrollments` / `certificates` で、こちらは
 * 「何人が・どの順で・どれくらいの間隔で進んだか」を後から集計するための素材。したがって
 * 書き込みは best-effort (失敗しても学習フローを止めない) で、同じ (user, stage, event) は
 * 1 件だけ積む (割当のやり直しで `started` が増殖すると経路の統計が歪むため)。
 * 「1 件だけ」は **一意索引で保証する** — アプリ側の「読んでから書く」だけでは、
 * 読みと書きの隙に同じ組が入ったときに二重に積まれる (0034)。
 */
export const stagePathEvents = sqliteTable(
  "stage_path_events",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    stageId: text("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    event: text("event", { enum: ["started", "cleared"] }).notNull(),
    /** 発生時刻 (epoch ms)。 */
    at: ts("at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    // 「このステージを何人が始めて何人がクリアしたか」の集計用。
    tenantStageEventIdx: index("stage_path_events_tenant_stage_event_idx").on(
      t.tenantId,
      t.stageId,
      t.event,
    ),
    // 「この受講者がどの順で進んだか」の再生用。
    userAtIdx: index("stage_path_events_user_at_idx").on(t.userId, t.at),
    // 同じ (受講者, ステージ, event) は 1 件だけ。insert + do nothing の衝突先でもある。
    userStageEventUnique: uniqueIndex("stage_path_events_user_stage_event_uq").on(
      t.userId,
      t.stageId,
      t.event,
    ),
  }),
);

// ---------------------------------------------------------------
// 学習フォーカスとキュー (ホームの「今日の一手 + 道のり」/ Phase 2)
// ---------------------------------------------------------------

/**
 * 受講者が「いま進める」と決めた 1 ステージ。**同時に 1 つだけ**。
 *
 * Phase 1 は「直近に進捗が付いた未クリアのステージ」を毎回導出していたが、それだと
 * クリア済みの星を読み返した直後にフォーカスが動くし、「◯◯を一時停止してこちらへ
 * 切り替える」という受講者の意思がどこにも残らない。意思は端末をまたいで効くべきなので
 * サーバに置く。まだ一度も選んでいない受講者には導出をフォールバックとして使う。
 *
 * `active_stage_id` が null なのは「明示的にフォーカスを外した」状態で、行ごと消さない
 * のは「一度も選んでいない」と区別できるようにしておくため。
 */
export const learnerFocus = sqliteTable("learner_focus", {
  userId: text("user_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  /** null = フォーカスなし (導出フォールバックに戻す)。 */
  activeStageId: text("active_stage_id").references(() => stages.id, { onDelete: "set null" }),
  updatedAt: tsNowUpd("updated_at"),
});

/**
 * 「次にやるリスト」— アクティブでないステージを受講者が自分で並べる待ち行列。
 *
 * 学習の正本ではない (割当は `enrollments`、進捗は `lesson_progress`)。並べ替えても
 * 何も解放されないし、消しても受講登録は残る。あくまで「次はこれをやる」という
 * 本人のメモで、ホームの道の下に出す。
 *
 * `order` は 0 から詰めた連番。並べ替えのたびに API 側が振り直す (歯抜けを許すと
 * 比較と挿入位置の扱いが場所ごとにぶれる)。
 */
export const stageQueue = sqliteTable(
  "stage_queue",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    stageId: text("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    order: integer("order").notNull().default(0),
    addedAt: tsNow("added_at"),
  },
  (t) => ({
    // 同じステージを二重に積ませない。追加 (insert + do nothing) の衝突先でもある。
    userStageUnique: uniqueIndex("stage_queue_user_stage_uq").on(t.userId, t.stageId),
    userOrderIdx: index("stage_queue_user_order_idx").on(t.userId, t.order),
  }),
);

/**
 * 飛び級で開いた星 (Phase 3a)。
 *
 * 腕試し (SkillCheck) に合格すると 1 行入り、評価器 (`@falcon/shared/skill-map`) の
 * `unlockedStageIds` として渡る = 前提を満たしていなくても `unlocked` になる。
 *
 * **クリア (修了) ではない。** 修了は従来どおり `enrollments.status = 'completed'` /
 * 修了証で、この行は「入口の鍵を開けた」だけ。だから前提の充足判定には効かない
 * (この星を前提に持つ次の星は開かない)。
 *
 * **一度開いた星は閉じない。** 不合格の受験を積んでも行は消さない (履歴は
 * `skill_check_attempts` 側)。
 */
export const stageUnlocks = sqliteTable(
  "stage_unlocks",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    stageId: text("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    /** 開いた経路。将来 staff の手動解放 / プレースメントが増えるので残す。 */
    via: text("via", { enum: ["skill_check"] })
      .notNull()
      .default("skill_check"),
    unlockedAt: tsNow("unlocked_at"),
  },
  (t) => ({
    // 二重解放を許さない (合格のたびの upsert の衝突先)。
    userStageUnique: uniqueIndex("stage_unlocks_user_stage_uq").on(t.userId, t.stageId),
  }),
);

/**
 * 腕試しの受験履歴 (Phase 3a)。
 *
 * `quiz_attempts` を流用しないのは、あちらが `quiz_id` 必須で 1 つの小テストに
 * 紐づくため。腕試しはステージ内の複数の小テストから抜いた混成なので載せる
 * `quiz_id` が無く、無理に 1 つ選ぶと XP の「合格した小テスト数」と受験回数上限に
 * 混ざる (詳細は migration 0036 のコメント)。
 */
export const skillCheckAttempts = sqliteTable(
  "skill_check_attempts",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    stageId: text("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    maxScore: integer("max_score").notNull(),
    passed: integer("passed", { mode: "boolean" }).notNull(),
    /** 出題した設問 id (出題は決定的だが、教材が編集されると再現できなくなる)。 */
    questionIds: json<string[]>("question_ids", []),
    answers: json<unknown[]>("answers", []),
    submittedAt: tsNow("submitted_at"),
  },
  (t) => ({
    userStageIdx: index("skill_check_attempts_user_stage_idx").on(
      t.userId,
      t.stageId,
      t.submittedAt,
    ),
  }),
);

// ---------------------------------------------------------------
// 発見教材 (Discovery / Phase 4)
// ---------------------------------------------------------------

/**
 * つまずきの記録 = 教材生成のリクエスト (Phase 4)。
 *
 * 小テストを同じ設問セットで 2 回落とす / 課題が再提出・不合格になる、といった
 * 「詰まった文脈」をここへ 1 行ずつ積む。講師はこの待ち行列から下書きを生成する。
 *
 * **`user_id` を持たない。** 誰がつまずいたかは教材に紐づけない — 共有ライブラリに
 * 個人の失敗履歴を残すと、講師の一覧が「誰が何を落としたか」の名簿になる。同じ
 * 文脈のつまずきは何人ぶんでも 1 行に畳む (一意索引が upsert の衝突先)。
 */
export const discoveryRequests = sqliteTable(
  "discovery_requests",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** つまずいた文脈のあるステージ (= 教材の源流。公開条件もここで判定する)。 */
    stageId: text("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    /** つまずきの短文 (小テスト / 課題のタイトルから作る)。生成プロンプトの材料。 */
    topic: text("topic").notNull(),
    origin: text("origin", { enum: ["quiz_fail", "submission_resubmit"] })
      .notNull()
      .default("quiz_fail"),
    createdAt: tsNow("created_at"),
  },
  (t) => ({
    topicUnique: uniqueIndex("discovery_requests_topic_uq").on(t.tenantId, t.stageId, t.topic),
  }),
);

/**
 * AI が生成した補強演習 (全ユーザー共有のライブラリ / Phase 4)。
 *
 * 受講者ごとの複製は作らない。誰に見せるかは **読み出し時に** 源流ステージの状態で
 * 決める (`unlock_condition`)。
 *
 * **公開されるのは `review_status = 'approved'` だけ**。生成直後は必ず `draft` で、
 * 講師が中身を読んで承認するまで受講者の応答には一切現れない (存在ごと出さない)。
 */
export const discoveryMaterials = sqliteTable(
  "discovery_materials",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    stageId: text("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    /** 選択式設問の配列 (正答フラグ入り)。**受講者向けの応答では必ず落とす。** */
    questions: json<DiscoveryQuestion[]>("questions", []),
    source: text("source", { enum: ["ai"] })
      .notNull()
      .default("ai"),
    /** 下書きを作った実体。`heuristic` は AI を呼べなかったときのフォールバック。 */
    generator: text("generator", { enum: ["anthropic", "heuristic"] })
      .notNull()
      .default("anthropic"),
    reviewStatus: text("review_status", { enum: ["draft", "approved", "rejected"] })
      .notNull()
      .default("draft"),
    /** 公開条件。いまは 1 種類だが、将来の拡張用に自由文字列で持つ。 */
    unlockCondition: text("unlock_condition").notNull().default("stage_active_or_cleared"),
    /** 元になったリクエスト (リクエストを消しても教材は残す)。 */
    requestId: text("request_id").references(() => discoveryRequests.id, { onDelete: "set null" }),
    createdAt: tsNow("created_at"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: ts("reviewed_at"),
  },
  (t) => ({
    stageIdx: index("discovery_materials_stage_idx").on(t.tenantId, t.stageId, t.reviewStatus),
  }),
);

/**
 * 発見教材の受験記録 (Phase 4)。
 *
 * `quiz_attempts` を流用しないのは、あちらが `quiz_id` 必須で 1 つの小テストに
 * 紐づくため (混ぜると XP の「合格した小テスト数」と小テストの受験回数上限に入る)。
 */
export const discoveryAttempts = sqliteTable(
  "discovery_attempts",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    materialId: text("material_id")
      .notNull()
      .references(() => discoveryMaterials.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    maxScore: integer("max_score").notNull(),
    percent: integer("percent").notNull(),
    passed: integer("passed", { mode: "boolean" }).notNull(),
    submittedAt: tsNow("submitted_at"),
  },
  (t) => ({
    userMaterialIdx: index("discovery_attempts_user_material_idx").on(
      t.userId,
      t.materialId,
      t.submittedAt,
    ),
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
// デイリー復習 (SRS — docs/superpowers/specs/2026-08-20-daily-srs-review-design.md)
// ---------------------------------------------------------------

/**
 * SM-2 のカード状態。 クイズで解答した設問ごとに 1 枚 (user_id × question_id)。
 * `due_date` はアプリ基準 TZ (Asia/Tokyo) の `YYYY-MM-DD` (study_activity.date と同じ規約)。
 * クイズ本編の受験と復習解答の両方が SM-2 の入力としてここを更新する。
 */
export const reviewCards = sqliteTable(
  "review_cards",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => quizQuestions.id, { onDelete: "cascade" }),
    ease: real("ease").notNull().default(2.5),
    intervalDays: integer("interval_days").notNull().default(1),
    reps: integer("reps").notNull().default(0),
    dueDate: text("due_date").notNull(),
    lastReviewedAt: ts("last_reviewed_at").notNull(),
    createdAt: tsNow("created_at"),
  },
  (t) => ({
    userQuestionUnique: uniqueIndex("review_cards_user_question_uq").on(t.userId, t.questionId),
    userDueIdx: index("review_cards_user_due_idx").on(t.userId, t.dueDate),
  }),
);

/**
 * 復習の解答ログ (1 解答 = 1 行の追記)。 「今日の解答数」の算出と、 将来の
 * アルゴリズム移行 (FSRS 等) のための学習データを兼ねる。 クイズ本編の受験は
 * quiz_attempts に残るためここには書かない。
 */
export const reviewLogs = sqliteTable(
  "review_logs",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    cardId: text("card_id")
      .notNull()
      .references(() => reviewCards.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    correct: integer("correct", { mode: "boolean" }).notNull(),
    answeredAt: tsNow("answered_at"),
  },
  (t) => ({
    userAnsweredIdx: index("review_logs_user_answered_idx").on(t.userId, t.answeredAt),
  }),
);

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
    stageId: text("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
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
    userStageUnique: uniqueIndex("enrollments_user_stage_uq").on(t.userId, t.stageId),
  }),
);

// ---------------------------------------------------------------
// 割当プリセット (受講登録のテンプレート)
// ---------------------------------------------------------------

/**
 * 「新入社員パック」 のように、 受講登録の組み合わせに名前を付けて保存したもの。
 *
 * 適用は 「その場で enrollments へ展開して終わり」 のスナップショット方式だった。 プリセットを
 * あとから編集しても、 適用済みの受講登録は追随しない (差分適用は `enrollments.preset_id`
 * を手掛かりに後から足せる)。 動的グループにすると、 教材を外したときの伝播や個別に
 * 伸ばした期限の扱いが一気に増えるため、 展開して切り離す作りにしてあった。
 *
 * ## Phase 3b で運用廃止。 テーブルは履歴として残置
 *
 * 管理者が割り当てる運用そのものを廃止し、 受講者が自分で始める自律モデルへ移行した
 * (`routes/stage-start.ts`)。 適用 API は 410 Gone、 適用 UI も無い。 それでもテーブルを
 * drop しないのは 2 つの理由から:
 *
 *   - **移行が additive でない**。 既存の `enrollments.preset_id` が指す先を失わせない
 *   - 監査ログ (`enrollment_preset_apply`) と過去の受講状況を突き合わせるのに要る
 *
 * 定義の CRUD (`routes/enrollment-presets.ts`) は残っているが、 新しく作っても適用先が
 * 無い。 実質は過去データの置き場である。
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
    stageId: text("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    required: integer("required", { mode: "boolean" }).notNull().default(true),
    /** 基準日からの日数。 null なら期限なし。 */
    dueOffsetDays: integer("due_offset_days"),
    /** 表示順 (学習してほしい順序の意図を残す)。 */
    order: integer("order").notNull().default(0),
  },
  (t) => ({
    presetStageUnique: uniqueIndex("enrollment_preset_items_preset_stage_uq").on(
      t.presetId,
      t.stageId,
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
  stageId: text("stage_id"),
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
    enum: [
      "announcement",
      "review_completed",
      "assignment_due",
      "interview_date_set",
      "interview_answer_template_generated",
      "interview_answer_template_failed",
    ],
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
  stageTitle: text("stage_title").notNull(),
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
  /** VS Code から引き継がれた提出のみ持つ採点失敗サマリ (Issue #9)。 Web 提出は null。 */
  gradingSummary: text("grading_summary", { mode: "json" }).$type<unknown>(),
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
    stageId: text("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    certCode: text("cert_code").notNull().unique(),
    issuedBy: text("issued_by"),
    issuedAt: tsNow("issued_at"),
    criteriaSnapshot: json<Record<string, unknown>>("criteria_snapshot", {}),
    recipientName: text("recipient_name").notNull(),
    stageTitle: text("stage_title").notNull(),
    tenantName: text("tenant_name").notNull(),
    revoked: integer("revoked", { mode: "boolean" }).notNull().default(false),
  },
  (t) => ({
    // 1 ユーザー 1 ステージにつき 1 通。 発行 API はこの制約を前提に
    // `onConflictDoNothing` で競合時のべき等性を担保する (制約が無いと D1 が
    // "ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint" で
    // 落ち、 修了証発行が常に 500 になる)。
    userStageUnique: uniqueIndex("certificates_user_stage_uq").on(t.userId, t.stageId),
  }),
);

// ---------------------------------------------------------------
// 殿堂 (Hall of Fame / Phase 5)
// ---------------------------------------------------------------

/**
 * 殿堂に載る 1 人ぶんのストーリー (Phase 5)。
 *
 * **1 人 1 行**。推薦 → 記入 → 公開 → 辞退 / 取り下げまでを同じ行の `status` で表す。
 * 履歴テーブルに分けないのは、殿堂に要るのは「今この人が載っているか」だけで、
 * 辞退や取り下げの経緯を掘り返せる形にしておくこと自体が本人への圧力になるため
 * (辞退は監査ログにも残さない — `@falcon/shared/admin/audit-actions` の注記を参照)。
 *
 * **序列の数値は持たない。** XP・レベル・クリア数はこの表に無く、公開応答にも出ない。
 * 載るのは名前・ジョブ (名乗り)・引用・歩んだ道・4 章の本文だけ。
 */
export const hallOfFameEntries = sqliteTable(
  "hall_of_fame_entries",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** 掲載される本人。プロフィールを消せば殿堂の行も消える (実名を残さない)。 */
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["nominated", "submitted", "published", "declined", "withdrawn"],
    })
      .notNull()
      .default("nominated"),
    /** 本人が名乗るジョブ (自由記述)。**表示専用** — 分類にも推薦にも使わない。 */
    jobTitle: text("job_title").notNull().default(""),
    quote: text("quote").notNull().default(""),
    chapters: json<HallOfFameChapters>("chapters", EMPTY_HOF_CHAPTERS),
    /**
     * **公開した時点の**クリア済みステージの写し。参照ではなく写しにするのは、
     * あとから教材が改名・非公開になっても、公開したときの「歩んだ道」がそのまま
     * 残るようにするため (掲載は本人が同意した時点の姿で固定する)。
     */
    pathSnapshot: json<HallOfFamePathStage[]>("path_snapshot", []),
    nominatedBy: text("nominated_by"),
    nominatedAt: tsNow("nominated_at"),
    submittedAt: ts("submitted_at"),
    publishedBy: text("published_by"),
    publishedAt: ts("published_at"),
    /** 辞退 / 取り下げ / 非公開化で降りた時刻。 */
    closedAt: ts("closed_at"),
  },
  (t) => ({
    userUnique: uniqueIndex("hall_of_fame_user_uq").on(t.tenantId, t.userId),
    statusIdx: index("hall_of_fame_status_idx").on(t.tenantId, t.status, t.publishedAt),
  }),
);

// ---------------------------------------------------------------
// 面談対策 (Interview Prep)
// ---------------------------------------------------------------

/**
 * 面談対策の想定質問バンク。 正本はリポジトリの
 * `packages/shared/src/interview/questions.json` で、 seed が upsert/prune する
 * (教材ステージと同じ運用 — CMS 編集 UI は無い)。
 */
export const interviewQuestions = sqliteTable(
  "interview_questions",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    no: integer("no").notNull(),
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
    /**
     * 人が編集した時刻 (Issue #237)。 null なら questions.json のまま。
     * seed の upsert はこの列が入っている行を上書きしない — 入れておかないと
     * main への push ごとに走る seed で現場の修正が消える。
     */
    editedAt: ts("edited_at"),
    editedBy: text("edited_by"),
    /**
     * 「正本の管理に戻す」の予約 (Issue #237)。 押した時点では本文はまだ編集後のまま
     * なので `edited_at` は落とさない (落とすと音声側が「編集前の読み上げを使ってよい」
     * と誤解する)。 次の seed が本文を正本へ書き戻すときに、 両方まとめて落ちる。
     */
    releaseRequestedAt: ts("release_requested_at"),
    createdAt: tsNow("created_at"),
    updatedAt: tsNowUpd("updated_at"),
  },
  (t) => ({
    tenantNoUnique: uniqueIndex("interview_questions_tenant_no_uq").on(t.tenantId, t.no),
  }),
);

/**
 * 汎用の排他ロック (Issue #237)。
 *
 * D1 の `insert ... on conflict do nothing` が「無ければ入れる」を不可分に行えることを
 * 使った素朴なミューテックス。 面談対策では「質問の本文更新 + 読み上げ音声の更新」を
 * 1 つのロックの中で行い、 同じ質問への同時操作で音声と本文が食い違わないようにする。
 * `expires_at` を過ぎたロックは取り直せる (保持中に Worker が落ちても詰まらない)。
 */
export const resourceLocks = sqliteTable("resource_locks", {
  /** ロック対象の識別子 (例: `interview-audio:<tenant>:<no>`)。 */
  id: text("id").primaryKey(),
  /** 取得者を表す使い捨てトークン。 自分が取ったロックだけを解放するために持つ。 */
  holder: text("holder").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

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
    /** 面談予定日 (参考情報。 LMS の正本ではない) — YYYY-MM-DD */
    interviewDate: text("interview_date"),
    interviewNote: text("interview_note"),
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

/** 受講者×質問ごとの個別「回答の型」(Issue #206)。 */
export const interviewPersonalTemplates = sqliteTable(
  "interview_personal_templates",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    questionNo: integer("question_no").notNull(),
    content: text("content"),
    draftContent: text("draft_content"),
    generatedFrom: text("generated_from"),
    source: text("source", { enum: ["ai", "manual"] })
      .notNull()
      .default("ai"),
    updatedBy: text("updated_by"),
    createdAt: tsNow("created_at"),
    updatedAt: tsNowUpd("updated_at"),
  },
  (t) => ({
    tenantProfileQuestionUnique: uniqueIndex("interview_personal_templates_tenant_profile_q_uq").on(
      t.tenantId,
      t.profileId,
      t.questionNo,
    ),
  }),
);

/**
 * 面談対策 — 質問ごとの学習ステータス (準備ホームの準備率の元データ)。
 * 表示ステータスは 4 段階 (未着手/型を読んだ/回答作成済み/練習OK) だが、 行が持つのは
 * read / confident のみ: 「回答作成済み」は個別回答の型の有無から導出し、 未着手は行なし。
 */
export const interviewProgress = sqliteTable(
  "interview_progress",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    questionNo: integer("question_no").notNull(),
    status: text("status", { enum: ["read", "confident"] })
      .notNull()
      .default("read"),
    practicedCount: integer("practiced_count").notNull().default(0),
    lastPracticedAt: ts("last_practiced_at"),
    /**
     * SM-2 系列 (Issue #235)。 デイリー復習の review_cards と同じ列構成で、
     * 更新も同じ `sm2Next` を通す。 未練習は due が null (= 「今日の練習セット」の
     * fresh バケット) で、 自己評価のたびに ease / interval / due が進む。
     */
    srsEase: real("srs_ease").notNull().default(2.5),
    srsIntervalDays: integer("srs_interval_days").notNull().default(0),
    srsReps: integer("srs_reps").notNull().default(0),
    /** 次回出題日 (`YYYY-MM-DD`)。 未練習は null。 */
    srsDueDate: text("srs_due_date"),
    /** 最後の自己評価。 「もう一度」= again を次のセットで最優先に再登場させる。 */
    lastResult: text("last_result", { enum: ["again", "good"] }),
    createdAt: tsNow("created_at"),
    updatedAt: tsNowUpd("updated_at"),
  },
  (t) => ({
    tenantProfileQuestionUnique: uniqueIndex("interview_progress_tenant_profile_q_uq").on(
      t.tenantId,
      t.profileId,
      t.questionNo,
    ),
  }),
);

/**
 * 面談対策 — 改善点メモ (Issue #234)。 振り返りで受講者が書き、 質問に紐付いて溜まる。
 * 未解決分は次回その質問に答える直前に再表示され、 克服したら resolved_at で消し込む。
 * 定型チップも自由入力も同じ 1 行として保存する。
 */
export const interviewFixNotes = sqliteTable(
  "interview_fix_notes",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    questionNo: integer("question_no").notNull(),
    text: text("text").notNull(),
    createdAt: tsNow("created_at"),
    resolvedAt: ts("resolved_at"),
  },
  (t) => ({
    tenantProfileQuestionIdx: index("interview_fix_notes_tenant_profile_q_idx").on(
      t.tenantId,
      t.profileId,
      t.questionNo,
    ),
  }),
);

/**
 * 面談対策 — 「今日の練習セット」(Issue #235)。
 *
 * 出題は作成時に確定させて行に残す。 毎回 SM-2 で引き直すと、 1 問答えるたびに
 * 残りの並びが変わって「今日はここまでやった」が残らないため。 中断・再開は
 * completed_nos の差分で表現し、 終了サマリ (準備率の伸び) のために作成時点の
 * 準備率を started_percent に控える。
 */
export const interviewPracticeSets = sqliteTable(
  "interview_practice_sets",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /** 作成した学習日 (アプリ基準 TZ の `YYYY-MM-DD`)。 */
    date: text("date").notNull(),
    /** 出題する質問番号 (優先度順)。 */
    questionNos: json<number[]>("question_nos", []),
    /** 自己評価を付けた質問番号。 */
    completedNos: json<number[]>("completed_nos", []),
    /** 「できた」を付けた質問番号 (終了サマリの n/10)。 */
    confidentNos: json<number[]>("confident_nos", []),
    /** 作成時点の準備率 (%)。 終了サマリの「伸び」の基準。 */
    startedPercent: integer("started_percent").notNull().default(0),
    status: text("status", { enum: ["active", "done"] })
      .notNull()
      .default("active"),
    /**
     * 楽観ロックの版数。 消化記録は JSON 配列の読み → 追記 → 書き戻しなので、
     * 自己評価が同時に 2 件走ると後着が先着の 1 問を消してしまう。 更新は
     * 「読んだときの版数と一致する行だけ」に限定して、 外れたら読み直す。
     */
    version: integer("version").notNull().default(0),
    createdAt: tsNow("created_at"),
    updatedAt: tsNowUpd("updated_at"),
  },
  (t) => ({
    tenantProfileStatusIdx: index("interview_practice_sets_tenant_profile_status_idx").on(
      t.tenantId,
      t.profileId,
      t.status,
    ),
    /**
     * 進行中のセットは受講者ごとに 1 つだけ (部分ユニーク)。 「途中のセットを再開」の
     * 取得が 1 行に定まり、 二重タップや StrictMode の二重取得でセットが増えない。
     */
    activeUnique: uniqueIndex("interview_practice_sets_active_uq")
      .on(t.tenantId, t.profileId)
      .where(sql`status = 'active'`),
  }),
);

/** Anthropic Message Batch による個別回答の型生成ジョブ (Issue #206)。 */
export const generationJobs = sqliteTable("generation_jobs", {
  id: uuid(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  profileId: text("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  batchId: text("batch_id").notNull(),
  status: text("status", { enum: ["pending", "done", "failed"] })
    .notNull()
    .default("pending"),
  requested: integer("requested").notNull().default(0),
  succeeded: integer("succeeded").notNull().default(0),
  createdAt: tsNow("created_at"),
  updatedAt: tsNowUpd("updated_at"),
});

/** 受講者ごとのスキルシート (Issue #203)。 1 人 1 行。 */
export const skillSheets = sqliteTable(
  "skill_sheets",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    r2Key: text("r2_key"),
    sheet: json<SkillSheetV1>("sheet", {
      sections: { basic: {}, skills: [], projects: [], certifications: [], self_pr: "" },
    }),
    updatedBy: text("updated_by"),
    createdAt: tsNow("created_at"),
    updatedAt: tsNowUpd("updated_at"),
  },
  (t) => ({
    tenantProfileUnique: uniqueIndex("skill_sheets_tenant_profile_uq").on(t.tenantId, t.profileId),
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
  "stages",
  "sections",
  "lessons",
  "lesson_materials",
  "lesson_material_versions",
  "lesson_revisions",
  "assignments",
  "lesson_progress",
  "study_activity",
  "stage_path_events",
  "learner_focus",
  "stage_queue",
  "stage_unlocks",
  "skill_check_attempts",
  "discovery_requests",
  "discovery_materials",
  "discovery_attempts",
  "quizzes",
  "quiz_questions",
  "quiz_options",
  "quiz_attempts",
  "review_cards",
  "review_logs",
  "enrollments",
  "enrollment_presets",
  "enrollment_preset_items",
  "announcements",
  "notifications",
  "submissions",
  "certificates",
  "hall_of_fame_entries",
  "audit_logs",
  "support_inquiries",
  "interview_questions",
  "interview_prep_assignments",
  "interview_personal_templates",
  "generation_jobs",
  "skill_sheets",
] as const;

export const TABLE_COUNT = APP_TABLES.length;
