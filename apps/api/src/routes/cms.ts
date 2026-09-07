/**
 * CMS API (旧 cms-api.ts の BaaS 直アクセス + RLS + reorder RPC の置き換え / Issue #10)。
 *
 * 認可 (旧 RLS):
 *   - ステージ**一覧** (`GET /api/cms/stages`) は staff のみ。 受講者に返すと、 割り当てても
 *     いない教材の題名・説明・所要時間がカタログとして丸ごと読める (スキルツリーの
 *     「霧」は演出でしかなくなる)。 受講者 UI は enrollment を起点に詳細を引くので影響しない。
 *   - ステージ**詳細** (`/api/cms/stages/:id` と旧拡張互換の `/api/cms/courses/:id`) は
 *     staff、 または **そのステージに enrollment がある受講者**。 published の判定は
 *     受講者側に残す (draft を受講登録しても中身は見えない)。
 *   - sections/lessons/assignments の read は同テナント、 published か staff。
 *   - quizzes (CMS 編集) と listAssignments は staff のみ。
 *   - 書き込みはすべて同テナントの instructor/admin。 子要素は親のテナントを継承して検証する。
 *   - reorder は単一 UPDATE 相当を順序付き upsert で原子的に行う。
 *
 * 返却形は旧 DB 行 (snake_case) に合わせ、 フロントのマッパー (@stella/shared/cms/types) を無変更に保つ。
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import {
  assignments,
  stages,
  enrollments,
  lessonMaterials,
  lessons,
  quizOptions,
  quizQuestions,
  quizzes,
  sections,
} from "../db/schema.js";
import {
  errorResponse,
  getCaller,
  requireRole,
  ApiError,
  isStaffRole,
  requireReturning,
} from "../lib/authz.js";
import type { Caller } from "../lib/authz.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { recordLessonRevision } from "../lib/lesson-revision.js";
import { withResourceLock } from "../lib/resource-lock.js";
import {
  MAX_ARCHIVED_PRESETS_IN_AUDIT,
  archiveEmptiedPresetsStatement,
  touchPresetsContainingStageStatement,
} from "../lib/enrollment-presets.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

export const cmsRoute = new Hono<{ Bindings: Env }>();

// --- mappers (Drizzle camelCase → 旧 DB 行 snake_case) ---
type StageSel = typeof stages.$inferSelect;
type SectionSel = typeof sections.$inferSelect;
type LessonSel = typeof lessons.$inferSelect;
type AssignmentSel = typeof assignments.$inferSelect;
type QuizSel = typeof quizzes.$inferSelect;
type QuestionSel = typeof quizQuestions.$inferSelect;
type OptionSel = typeof quizOptions.$inferSelect;

const stageToRow = (c: StageSel) => ({
  id: c.id,
  tenant_id: c.tenantId,
  slug: c.slug,
  title: c.title,
  category: c.category,
  color: c.color,
  thumbnail_path: c.thumbnailPath,
  duration_hours: c.durationHours,
  description: c.description,
  instructor_name: c.instructorName,
  status: c.status,
  created_by: c.createdBy,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
  require_all_lessons: c.requireAllLessons,
  require_quiz_pass: c.requireQuizPass,
  require_assignment_pass: c.requireAssignmentPass,
  auto_issue_certificate: c.autoIssueCertificate,
});
const sectionToRow = (s: SectionSel) => ({
  id: s.id,
  stage_id: s.stageId,
  title: s.title,
  order: s.order,
  created_at: s.createdAt,
});
const lessonToRow = (l: LessonSel) => ({
  id: l.id,
  section_id: l.sectionId,
  title: l.title,
  type: l.type,
  order: l.order,
  duration_label: l.durationLabel,
  video_path: l.videoPath,
  pdf_path: l.pdfPath,
  markdown: l.markdown,
  assignment_id: l.assignmentId,
  total_pages: l.totalPages,
  total_sec: l.totalSec,
  created_at: l.createdAt,
  updated_at: l.updatedAt,
});
const assignmentToRow = (a: AssignmentSel) => ({
  id: a.id,
  tenant_id: a.tenantId,
  stage: a.stage,
  chapter_id: a.chapterId,
  title: a.title,
  description: a.description,
  language: a.language,
  test_kind: a.testKind,
  starter_files: a.starterFiles,
  entry_file: a.entryFile,
  entry_points: a.entryPoints,
  tests: a.tests,
  sql_seed: a.sqlSeed,
  lint_preset: a.lintPreset,
  static_analysis: a.staticAnalysis,
  mutation: a.mutation,
  demo_call: a.demoCall,
  created_by: a.createdBy,
  created_at: a.createdAt,
  updated_at: a.updatedAt,
});
const quizToRow = (q: QuizSel) => ({
  id: q.id,
  lesson_id: q.lessonId,
  pass_score: q.passScore,
  time_limit_sec: q.timeLimitSec,
  max_attempts: q.maxAttempts,
  created_at: q.createdAt,
  updated_at: q.updatedAt,
});
const questionToRow = (q: QuestionSel) => ({
  id: q.id,
  quiz_id: q.quizId,
  kind: q.kind,
  prompt: q.prompt,
  explanation: q.explanation,
  points: q.points,
  order: q.order,
  created_at: q.createdAt,
  updated_at: q.updatedAt,
});
const optionToRow = (o: OptionSel) => ({
  id: o.id,
  question_id: o.questionId,
  label: o.label,
  is_correct: o.isCorrect,
  order: o.order,
});

// --- tenant 検証ヘルパ (子要素の書き込み時に親のテナント所属を確認) ---
async function stageTenant(db: Db, stageId: string): Promise<string | null> {
  const rows = await db
    .select({ t: stages.tenantId })
    .from(stages)
    .where(eq(stages.id, stageId))
    .limit(1);
  return rows[0]?.t ?? null;
}
/** 監査ログ用に、 テナント検証と同時にステージの現在値も取る (公開/削除の記録に使う)。 */
async function stageAuditInfo(
  db: Db,
  stageId: string,
): Promise<{ tenant: string; status: StageSel["status"]; title: string; slug: string } | null> {
  const rows = await db
    .select({
      tenant: stages.tenantId,
      status: stages.status,
      title: stages.title,
      slug: stages.slug,
    })
    .from(stages)
    .where(eq(stages.id, stageId))
    .limit(1);
  return rows[0] ?? null;
}
async function sectionStage(
  db: Db,
  sectionId: string,
): Promise<{ stageId: string; tenant: string } | null> {
  const rows = await db
    .select({ stageId: sections.stageId, tenant: stages.tenantId })
    .from(sections)
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .where(eq(sections.id, sectionId))
    .limit(1);
  return rows[0] ?? null;
}
async function lessonTenant(db: Db, lessonId: string): Promise<string | null> {
  const rows = await db
    .select({ tenant: stages.tenantId })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  return rows[0]?.tenant ?? null;
}
async function quizTenant(db: Db, quizId: string): Promise<string | null> {
  const rows = await db
    .select({ tenant: stages.tenantId })
    .from(quizzes)
    .innerJoin(lessons, eq(lessons.id, quizzes.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .where(eq(quizzes.id, quizId))
    .limit(1);
  return rows[0]?.tenant ?? null;
}
async function questionTenant(db: Db, questionId: string): Promise<string | null> {
  const rows = await db
    .select({ tenant: stages.tenantId })
    .from(quizQuestions)
    .innerJoin(quizzes, eq(quizzes.id, quizQuestions.quizId))
    .innerJoin(lessons, eq(lessons.id, quizzes.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .where(eq(quizQuestions.id, questionId))
    .limit(1);
  return rows[0]?.tenant ?? null;
}
function assertTenant(t: string | null, caller: Caller): void {
  if (t == null) throw new ApiError("対象が見つかりません", 404);
  if (t !== caller.tenantId) throw new ApiError("他テナントのリソースは操作できません", 403);
}

/**
 * レッスン削除 (直接 / section・stage からの cascade) 前に、 紐づく配布資料の
 * R2 オブジェクトをベストエフォートで削除する (Issue #72)。
 * DB 行は FK cascade で消えるため、 ここでは R2 実体のみ扱う。
 * R2 未設定・削除失敗でもコンテンツ削除は妨げない (孤児はログに残す)。
 */
async function deleteMaterialObjects(db: Db, env: Env, lessonIds: string[]): Promise<void> {
  if (lessonIds.length === 0) return;
  const bucket = env.MATERIALS_BUCKET;
  if (!bucket) return;
  try {
    // 自動生成 PDF (source=auto) の実体は消さない — R2 の版オブジェクトは全版保持が
    // 仕様で (2026-08-26 spec)、教材が正本なので次の seed が行を作り直す。
    const rows = await db
      .select({ path: lessonMaterials.path })
      .from(lessonMaterials)
      .where(
        and(inArray(lessonMaterials.lessonId, lessonIds), eq(lessonMaterials.source, "upload")),
      );
    if (rows.length > 0) {
      await bucket.delete(rows.map((r) => r.path));
    }
  } catch (e) {
    console.error("[cms] 配布資料の R2 削除に失敗 (孤児オブジェクト)", lessonIds, e);
  }
}

// =================================================================
// Stages
// =================================================================

/**
 * この slug を前提 (`prerequisites`) に挙げている **公開中の** ステージを探す。
 *
 * 前提はスキルツリーのハードロックなので、 前提側を非公開にしたり消したりすると、
 * 依存しているステージは **誰も開けない星** になる (評価器は未知 slug を「決して
 * クリアされない前提」として安全側に倒すため、 画面には何も出ない)。 黙って壊れるより
 * 操作を止める方がよいので、 呼び出し側はこれが空でなければ 409 にする。
 *
 * `prerequisites` は slug の JSON 配列文字列。 テナントのステージ数は 2 桁なので、
 * SQL で JSON を舐めず全件引いて JS で判定する (D1 の json1 依存も増やさない)。
 */
async function publishedDependents(
  db: Db,
  tenantId: string,
  slug: string,
  excludeStageId: string,
): Promise<{ id: string; title: string }[]> {
  const rows = await db
    .select({ id: stages.id, title: stages.title, prerequisites: stages.prerequisites })
    .from(stages)
    .where(and(eq(stages.tenantId, tenantId), eq(stages.status, "published")));
  return rows
    .filter((row) => {
      if (row.id === excludeStageId) return false;
      if (!row.prerequisites) return false;
      try {
        const parsed: unknown = JSON.parse(row.prerequisites);
        return Array.isArray(parsed) && parsed.includes(slug);
      } catch {
        // 壊れた行は依存として数えない (評価器側で locked に倒れる別の問題)。
        return false;
      }
    })
    .map((row) => ({ id: row.id, title: row.title }));
}

/** 依存が残っているときの 409。 どれを直せばよいかタイトルで示す。 */
function assertNoPublishedDependents(
  dependents: { title: string }[],
  action: "非公開に" | "削除",
): void {
  if (dependents.length === 0) return;
  throw new ApiError(
    `この教材を前提にしている公開中の教材があるため${action}できません: ${dependents
      .map((d) => d.title)
      .join(" / ")}。 先に依存側の前提を外すか非公開にしてください`,
    409,
  );
}

/** 講師表示名 (Issue #74) を正規化する。 未入力 / 空白のみは null (= 未設定) に倒す。 */
function normalizeInstructorName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * staff: 同テナントのステージ一覧 (CMS / 割当画面のカタログ)。
 *
 * **受講者には出さない。** スキルツリーは「まだ見えない星」を伏せるのが仕様で、
 * その伏せ字は API 境界で守る必要がある (`routes/skill-map.ts` のヘッダ参照)。
 * 一覧をそのまま返すと、 受講者が `curl` 一発で全教材の題名・説明を読めてしまい、
 * 画面側の伏せ字が演出でしかなくなる。 受講者の一覧は
 * `GET /api/enrollments/mine` (自分の割当) と `GET /api/skill-map/mine` (視界つき) が担う。
 */
cmsRoute.get("/api/cms/stages", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const rows = await db
      .select()
      .from(stages)
      .where(eq(stages.tenantId, caller.tenantId))
      .orderBy(desc(stages.updatedAt));
    return c.json({ rows: rows.map(stageToRow) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * ステージ詳細 (木構造)。 応答の key を差し替えられるようにしてある — 旧
 * `/api/cms/courses/:id` は外側 / 内側とも `course` で返していたため
 * (`{ course: { course: row, sections: [...] } }`)。
 */
function stageDetailHandler(key: "stage" | "course") {
  return async (c: Context<{ Bindings: Env }, "/:id">) => {
    try {
      const { caller, db } = await getCaller(c);
      const stageId = c.req.param("id");
      // 受講者が詳細を引けるのは **自分が受講登録されたステージ** だけ。 id を総当たり
      // されても中身が漏れないよう、 ステージ行を引く前に判定する (存在の有無で応答が
      // 変わると、 それ自体がカタログになる)。 旧 VS Code 拡張も受講中のステージしか
      // 叩かない (`enrolledCourseIds` で絞ってから詳細を取る) ので、 この判定で壊れない。
      if (!isStaffRole(caller.role)) {
        const enrolled = await db
          .select({ id: enrollments.id })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.tenantId, caller.tenantId),
              eq(enrollments.userId, caller.id),
              eq(enrollments.stageId, stageId),
            ),
          )
          .limit(1);
        if (!enrolled[0]) throw new ApiError("この教材は受講登録されていません", 403);
      }
      const stageRows = await db.select().from(stages).where(eq(stages.id, stageId)).limit(1);
      const stage = stageRows[0];
      if (!stage || stage.tenantId !== caller.tenantId) return c.json({ [key]: null });
      if (stage.status !== "published" && !isStaffRole(caller.role)) return c.json({ [key]: null });

      const sectionRows = await db
        .select()
        .from(sections)
        .where(eq(sections.stageId, stageId))
        .orderBy(asc(sections.order));
      const sectionIds = sectionRows.map((s) => s.id);
      const lessonRows =
        sectionIds.length > 0
          ? await db
              .select()
              .from(lessons)
              .where(inArray(lessons.sectionId, sectionIds))
              .orderBy(asc(lessons.order))
          : [];

      return c.json({
        [key]: {
          [key]: stageToRow(stage),
          sections: sectionRows.map((s) => ({
            section: sectionToRow(s),
            lessons: lessonRows.filter((l) => l.sectionId === s.id).map(lessonToRow),
          })),
        },
      });
    } catch (err) {
      return errorResponse(c, err);
    }
  };
}

cmsRoute.get("/api/cms/stages/:id", stageDetailHandler("stage"));

/**
 * TODO(stage-rename-compat): 旧拡張(<=0.1.0)互換。 拡張更新の浸透後に削除
 *
 * VS Code 拡張は手動 VSIX / marketplace 配布で API と同時に更新できない。 旧拡張は
 * `GET /api/cms/courses/:id` を叩いて `{ course: { course, sections } }` をパースするので、
 * このエンドポイントだけ旧パス + 旧 key で残す (CMS 管理系の他ルートには広げない)。
 */
cmsRoute.get("/api/cms/courses/:id", stageDetailHandler("course"));

cmsRoute.post("/api/cms/stages", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const input = (await c.req.json()) as Record<string, unknown> & { id?: string };
    const values = {
      tenantId: caller.tenantId,
      slug: String(input.slug),
      title: String(input.title),
      category: (input.category as string | null) ?? null,
      color: (input.color as StageSel["color"]) ?? null,
      // サムネイルは教材リポジトリの seed が正本。 キーを送ってこないクライアント
      // (旧 CMS 画面) の保存で消えないよう、 明示的に来たときだけ更新する。
      ...("thumbnail_path" in input
        ? { thumbnailPath: (input.thumbnail_path as string | null) ?? null }
        : {}),
      durationHours: (input.duration_hours as number | null) ?? null,
      description: (input.description as string | null) ?? null,
      // 空文字は「未設定」 に正規化する (受講者 UI で講師欄を出さないため)。
      instructorName: normalizeInstructorName(input.instructor_name),
      status: (input.status as StageSel["status"]) ?? "draft",
      requireAllLessons: (input.require_all_lessons as boolean) ?? true,
      requireQuizPass: (input.require_quiz_pass as boolean) ?? true,
      requireAssignmentPass: (input.require_assignment_pass as boolean) ?? true,
      autoIssueCertificate: (input.auto_issue_certificate as boolean) ?? true,
    };
    let row: StageSel;
    if (input.id) {
      assertTenant(await stageTenant(db, input.id), caller);
      row = requireReturning(
        await db
          .update(stages)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(stages.id, input.id))
          .returning(),
        "stage update",
      );
    } else {
      row = requireReturning(await db.insert(stages).values(values).returning(), "stage insert");
    }
    return c.json({ row: stageToRow(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.patch("/api/cms/stages/:id/status", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const id = c.req.param("id");
    const info = await stageAuditInfo(db, id);
    if (!info) throw new ApiError("対象が見つかりません", 404);
    assertTenant(info.tenant, caller);
    const { status } = (await c.req.json()) as { status: StageSel["status"] };
    // 公開を降ろすときだけ、 この教材を前提にしている公開中の教材が無いか確かめる。
    // 降ろした瞬間に依存側が「誰も開けない星」になるため (評価器は安全側に locked で倒す)。
    if (info.status === "published" && status !== "published") {
      assertNoPublishedDependents(
        await publishedDependents(db, caller.tenantId, info.slug, id),
        "非公開に",
      );
    }
    await db.update(stages).set({ status, updatedAt: new Date() }).where(eq(stages.id, id));
    // 公開 / 非公開は監査上の意味が違うため action を分ける (Issue #64)。
    const wasPublished = info.status === "published";
    await recordAudit(db, caller, {
      action:
        status === "published"
          ? "stage_publish"
          : wasPublished
            ? "stage_unpublish"
            : "stage_status_change",
      targetType: "stage",
      targetId: id,
      ip: clientIp(c),
      metadata: { title: info.title, slug: info.slug, from: info.status, to: status },
    });
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.delete("/api/cms/stages/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const id = c.req.param("id");
    const info = await stageAuditInfo(db, id);
    if (!info) throw new ApiError("対象が見つかりません", 404);
    assertTenant(info.tenant, caller);
    // 前提に挙げられている教材を消すと、 依存側は「誰も開けない星」になる。 消す前に止める
    // (削除は取り消せないので、 非公開より強く守る)。
    assertNoPublishedDependents(
      await publishedDependents(db, caller.tenantId, info.slug, id),
      "削除",
    );
    // cascade で消えるレッスン配下の配布資料 R2 実体を先に掃除する。
    const lessonRows = await db
      .select({ id: lessons.id })
      .from(lessons)
      .innerJoin(sections, eq(sections.id, lessons.sectionId))
      .where(eq(sections.stageId, id));
    await deleteMaterialObjects(
      db,
      c.env,
      lessonRows.map((l) => l.id),
    );
    // 教材が消えると割当プリセットの項目も cascade で消える。 最後の 1 件だった場合は
    // 「適用すれば必ず失敗する空のプリセット」 が残るため、 同じトランザクションで退役させる。
    // 別々に流すと、 教材の削除だけ確定して退役が失敗したとき、 再実行しても教材はもう無い
    // (404) ので直せず、 空のプリセットが恒久的に残る。
    const [, , archivedPresets] = await db.batch([
      // 版を進めるのは削除より前。 削除後は cascade で項目が消え、 影響を受けたプリセットを
      // 引けなくなる。 項目が減っただけのプリセットも 「内容が変わった」 ので版を進める
      // (適用中の分割送信が、 約束どおり 409 で止まるようにする)。
      touchPresetsContainingStageStatement(db, caller.tenantId, id),
      db.delete(stages).where(eq(stages.id, id)),
      archiveEmptiedPresetsStatement(db, caller.tenantId),
    ]);
    // 削除後は行が消えるため、 タイトル等は削除前に取った値を残す。
    await recordAudit(db, caller, {
      action: "stage_delete",
      targetType: "stage",
      targetId: id,
      ip: clientIp(c),
      metadata: {
        title: info.title,
        slug: info.slug,
        status: info.status,
        lesson_count: lessonRows.length,
        // 巻き添えで畳んだプリセットは黙って消さず、 監査から辿れるようにする。
        // 1 行が膨らみすぎないよう件数は丸める (全件は退役状態そのものが記録になる)。
        ...(archivedPresets.length > 0
          ? {
              archived_presets: archivedPresets
                .slice(0, MAX_ARCHIVED_PRESETS_IN_AUDIT)
                .map((p) => ({ id: p.id, name: p.name })),
              archived_preset_count: archivedPresets.length,
            }
          : {}),
      },
    });
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// =================================================================
// Sections
// =================================================================

cmsRoute.post("/api/cms/sections", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const input = (await c.req.json()) as {
      id?: string;
      stage_id: string;
      title: string;
      order?: number;
    };
    assertTenant(await stageTenant(db, input.stage_id), caller);
    const values = { stageId: input.stage_id, title: input.title, order: input.order ?? 0 };
    let row: SectionSel;
    if (input.id) {
      row = requireReturning(
        await db.update(sections).set(values).where(eq(sections.id, input.id)).returning(),
        "section update",
      );
    } else {
      row = requireReturning(
        await db.insert(sections).values(values).returning(),
        "section insert",
      );
    }
    return c.json({ row: sectionToRow(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.delete("/api/cms/sections/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const sc = await sectionStage(db, c.req.param("id"));
    assertTenant(sc?.tenant ?? null, caller);
    // cascade で消えるレッスン配下の配布資料 R2 実体を先に掃除する。
    const lessonRows = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.sectionId, c.req.param("id")));
    await deleteMaterialObjects(
      db,
      c.env,
      lessonRows.map((l) => l.id),
    );
    await db.delete(sections).where(eq(sections.id, c.req.param("id")));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.post("/api/cms/sections/reorder", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const { stageId, orderedIds } = (await c.req.json()) as {
      stageId: string;
      orderedIds: string[];
    };
    assertTenant(await stageTenant(db, stageId), caller);
    // 順序付きで各行の order を更新する (stage 内に限定)。 並列実行でレイテンシを抑える。
    await Promise.all(
      orderedIds.map((id, i) =>
        db
          .update(sections)
          .set({ order: i })
          .where(and(eq(sections.id, id), eq(sections.stageId, stageId))),
      ),
    );
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// =================================================================
// Lessons
// =================================================================

cmsRoute.post("/api/cms/lessons", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const input = (await c.req.json()) as Record<string, unknown> & {
      id?: string;
      section_id: string;
    };
    const sc = await sectionStage(db, input.section_id);
    assertTenant(sc?.tenant ?? null, caller);
    const values = {
      sectionId: input.section_id,
      title: String(input.title),
      type: input.type as LessonSel["type"],
      order: (input.order as number) ?? 0,
      durationLabel: (input.duration_label as string | null) ?? null,
      videoPath: (input.video_path as string | null) ?? null,
      pdfPath: (input.pdf_path as string | null) ?? null,
      markdown: (input.markdown as string | null) ?? null,
      assignmentId: (input.assignment_id as string | null) ?? null,
      totalPages: (input.total_pages as number | null) ?? null,
      totalSec: (input.total_sec as number | null) ?? null,
    };
    // 本文のリビジョン記録つき保存。markdown が null になる保存 (type 変更等) も、
    // 履歴のあるレッスンでは「本文が消えた」リビジョンとして残る (lesson-revision.ts)。
    const save = async (): Promise<LessonSel> => {
      let row: LessonSel;
      if (input.id) {
        row = requireReturning(
          await db
            .update(lessons)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(lessons.id, input.id))
            .returning(),
          "lesson update",
        );
      } else {
        row = requireReturning(
          await db.insert(lessons).values(values).returning(),
          "lesson insert",
        );
      }
      await recordLessonRevision(db, {
        lessonId: row.id,
        markdown: row.markdown,
        source: "cms",
        createdBy: caller.id,
      });
      return row;
    };
    let row: LessonSel;
    if (input.id) {
      // 既存レッスンは「本文更新 → リビジョン記録」をレッスン単位で直列化する。
      // 別々に走ると、同時保存の入れ違いで「本文は B なのに最新リビジョンは A」に
      // なりうるため (D1 に比較交換が無いのは interview-prep と同じ事情)。
      const locked = await withResourceLock(db, `lesson-markdown:${input.id}`, save);
      if (!locked.ran) {
        throw new ApiError(
          "同じレッスンが他の操作で更新中です。少し待ってから保存し直してください",
          409,
        );
      }
      row = locked.value;
    } else {
      // 新規レッスンの id は insert まで決まらないので、ロック無しで保存する
      // (まだ誰も参照していない行なので競合しない)。
      row = await save();
    }
    return c.json({ row: lessonToRow(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.delete("/api/cms/lessons/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    assertTenant(await lessonTenant(db, c.req.param("id")), caller);
    // cascade で消える配布資料の R2 実体を先に掃除する。
    await deleteMaterialObjects(db, c.env, [c.req.param("id")]);
    await db.delete(lessons).where(eq(lessons.id, c.req.param("id")));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.post("/api/cms/lessons/reorder", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const { sectionId, orderedIds } = (await c.req.json()) as {
      sectionId: string;
      orderedIds: string[];
    };
    const sc = await sectionStage(db, sectionId);
    assertTenant(sc?.tenant ?? null, caller);
    await Promise.all(
      orderedIds.map((id, i) =>
        db
          .update(lessons)
          .set({ order: i })
          .where(and(eq(lessons.id, id), eq(lessons.sectionId, sectionId))),
      ),
    );
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// =================================================================
// Quiz (CMS 編集 — staff のみ)
// =================================================================

cmsRoute.get("/api/cms/quiz/by-lesson/:lessonId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const lessonId = c.req.param("lessonId");
    assertTenant(await lessonTenant(db, lessonId), caller);
    const quizRows = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).limit(1);
    const quiz = quizRows[0];
    if (!quiz) return c.json({ quiz: null });

    const qRows = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quiz.id))
      .orderBy(asc(quizQuestions.order));
    const oRows =
      qRows.length > 0
        ? await db
            .select()
            .from(quizOptions)
            .where(
              inArray(
                quizOptions.questionId,
                qRows.map((q) => q.id),
              ),
            )
            .orderBy(asc(quizOptions.order))
        : [];
    return c.json({
      quiz: {
        quiz: quizToRow(quiz),
        questions: qRows.map((q) => ({
          ...questionToRow(q),
          options: oRows.filter((o) => o.questionId === q.id).map(optionToRow),
        })),
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.post("/api/cms/quiz/ensure", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const { lessonId } = (await c.req.json()) as { lessonId: string };
    assertTenant(await lessonTenant(db, lessonId), caller);
    const existing = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).limit(1);
    if (existing[0]) return c.json({ row: quizToRow(existing[0]) });
    const row = requireReturning(
      await db.insert(quizzes).values({ lessonId }).returning(),
      "quiz insert",
    );
    return c.json({ row: quizToRow(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.patch("/api/cms/quiz/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const id = c.req.param("id");
    assertTenant(await quizTenant(db, id), caller);
    const p = (await c.req.json()) as Record<string, unknown>;
    const row = requireReturning(
      await db
        .update(quizzes)
        .set({
          ...(p.pass_score !== undefined ? { passScore: p.pass_score as number } : {}),
          ...(p.time_limit_sec !== undefined
            ? { timeLimitSec: p.time_limit_sec as number | null }
            : {}),
          ...(p.max_attempts !== undefined ? { maxAttempts: p.max_attempts as number | null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(quizzes.id, id))
        .returning(),
      "quiz update",
    );
    return c.json({ row: quizToRow(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.post("/api/cms/quiz-questions", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const input = (await c.req.json()) as Record<string, unknown> & {
      id?: string;
      quiz_id: string;
    };
    assertTenant(await quizTenant(db, input.quiz_id), caller);
    const values = {
      quizId: input.quiz_id,
      kind: input.kind as QuestionSel["kind"],
      prompt: String(input.prompt),
      explanation: (input.explanation as string | null) ?? null,
      points: (input.points as number) ?? 1,
      order: (input.order as number) ?? 0,
    };
    let row: QuestionSel;
    if (input.id) {
      row = requireReturning(
        await db
          .update(quizQuestions)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(quizQuestions.id, input.id))
          .returning(),
        "quiz question update",
      );
    } else {
      row = requireReturning(
        await db.insert(quizQuestions).values(values).returning(),
        "quiz question insert",
      );
    }
    return c.json({ row: questionToRow(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.delete("/api/cms/quiz-questions/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    assertTenant(await questionTenant(db, c.req.param("id")), caller);
    await db.delete(quizQuestions).where(eq(quizQuestions.id, c.req.param("id")));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.post("/api/cms/quiz-options", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const input = (await c.req.json()) as {
      id?: string;
      question_id: string;
      label: string;
      is_correct?: boolean;
      order?: number;
    };
    assertTenant(await questionTenant(db, input.question_id), caller);
    const values = {
      questionId: input.question_id,
      label: input.label,
      isCorrect: input.is_correct ?? false,
      order: input.order ?? 0,
    };
    let row: OptionSel;
    if (input.id) {
      row = requireReturning(
        await db.update(quizOptions).set(values).where(eq(quizOptions.id, input.id)).returning(),
        "quiz option update",
      );
    } else {
      row = requireReturning(
        await db.insert(quizOptions).values(values).returning(),
        "quiz option insert",
      );
    }
    return c.json({ row: optionToRow(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.delete("/api/cms/quiz-options/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    // option → question → ... のテナント検証。
    const rows = await db
      .select({ questionId: quizOptions.questionId })
      .from(quizOptions)
      .where(eq(quizOptions.id, c.req.param("id")))
      .limit(1);
    if (!rows[0]) throw new ApiError("対象が見つかりません", 404);
    assertTenant(await questionTenant(db, rows[0].questionId), caller);
    await db.delete(quizOptions).where(eq(quizOptions.id, c.req.param("id")));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// =================================================================
// Assignments
// =================================================================

cmsRoute.get("/api/cms/assignments", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const rows = await db
      .select()
      .from(assignments)
      .where(eq(assignments.tenantId, caller.tenantId))
      .orderBy(desc(assignments.updatedAt));
    return c.json({ rows: rows.map(assignmentToRow) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.get("/api/cms/assignments/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const id = c.req.param("id");
    const rows = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
    const a = rows[0];
    if (!a || a.tenantId !== caller.tenantId) return c.json({ row: null });
    if (!isStaffRole(caller.role)) {
      // 受講者は published ステージ配下のレッスンに紐付く課題のみ。
      const linked = await db
        .select({ id: lessons.id })
        .from(lessons)
        .innerJoin(sections, eq(sections.id, lessons.sectionId))
        .innerJoin(stages, eq(stages.id, sections.stageId))
        .where(
          and(
            eq(lessons.assignmentId, id),
            eq(stages.status, "published"),
            eq(stages.tenantId, caller.tenantId),
          ),
        )
        .limit(1);
      if (!linked[0]) return c.json({ row: null });
    }
    return c.json({ row: assignmentToRow(a) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.post("/api/cms/assignments", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const input = (await c.req.json()) as Record<string, unknown> & { id: string };
    // tenant は caller に固定する。
    const values = {
      id: String(input.id),
      tenantId: caller.tenantId,
      stage: String(input.stage),
      chapterId: String(input.chapter_id),
      title: String(input.title),
      description: String(input.description ?? ""),
      language: String(input.language ?? "javascript"),
      testKind: String(input.test_kind),
      starterFiles: Array.isArray(input.starter_files) ? input.starter_files : [],
      entryFile: (input.entry_file as string | null) ?? null,
      entryPoints: input.entry_points ?? null,
      tests: Array.isArray(input.tests) ? input.tests : [],
      sqlSeed: (input.sql_seed as string | null) ?? null,
      lintPreset: input.lint_preset ?? null,
      staticAnalysis: input.static_analysis ?? null,
      mutation: input.mutation ?? null,
      demoCall: (input.demo_call as string | null) ?? null,
    };
    const row = requireReturning(
      await db
        .insert(assignments)
        .values(values)
        .onConflictDoUpdate({ target: assignments.id, set: { ...values, updatedAt: new Date() } })
        .returning(),
      "assignment upsert",
    );
    // 越テナント上書き防止: 既存が別テナントなら弾く。
    if (row.tenantId !== caller.tenantId)
      throw new ApiError("他テナントの課題は操作できません", 403);
    return c.json({ row: assignmentToRow(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.delete("/api/cms/assignments/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const id = c.req.param("id");
    const rows = await db
      .select({ t: assignments.tenantId })
      .from(assignments)
      .where(eq(assignments.id, id))
      .limit(1);
    assertTenant(rows[0]?.t ?? null, caller);
    await db.delete(assignments).where(eq(assignments.id, id));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});
