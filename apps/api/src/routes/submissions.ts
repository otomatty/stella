/**
 * 課題提出 / 添削 API (旧 submissions テーブル + RLS + notify_review_completed トリガー / Issue #8)。
 *
 * 認可 (旧 RLS):
 *   - 受講者は自分の提出のみ insert (student_id = caller)。
 *   - 受講者は mine / 本人の :id を select 可。
 *   - 講師 / 管理者は同テナントの提出を一覧 / 更新。
 * 添削確定 (reviewed_at が初めて設定) で受講者へ review_completed 通知を生成する。
 *
 * 返却形は旧 PostgREST 埋め込み (`profiles!student_id(...)`) に合わせ、
 * `profiles: { display_name, initials }` をネストしてフロントのマッパーを無変更に保つ。
 */

import { nextSubmissionAttempt } from "@falcon/shared/review/escalation";
import { isGradingSummary, parseGradingSummary } from "@falcon/shared/review/grading-summary";
import type { GradingSummary } from "@falcon/shared/review/types";
import { Hono } from "hono";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { notifications, profiles, submissions } from "../db/schema.js";
import {
  errorResponse,
  getCaller,
  requireRole,
  ApiError,
  isStaffRole,
  requireReturning,
} from "../lib/authz.js";
import { clientIp } from "../lib/audit.js";
import { noteSubmissionStumble } from "../lib/discovery-stumble.js";
import {
  autoCompleteStagesIfMet,
  reclaimAutoCertificatesIfUnmet,
  stageIdsOfLessons,
} from "../lib/stage-auto-complete.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

export const submissionsRoute = new Hono<{ Bindings: Env }>();

type SubmissionSelect = typeof submissions.$inferSelect;

/** DB 行 + 投稿者プロフィールを旧 PostgREST 形 (snake_case + profiles ネスト) に整える。 */
function toRow(
  s: SubmissionSelect,
  profile: { display_name: string; initials: string | null } | null,
) {
  return {
    id: s.id,
    tenant_id: s.tenantId,
    student_id: s.studentId,
    lesson_id: s.lessonId,
    assignment_id: s.assignmentId,
    stage_title: s.stageTitle,
    section_title: s.sectionTitle,
    assignment_title: s.assignmentTitle,
    code: s.code,
    status: s.status,
    priority: s.priority,
    attempt: s.attempt,
    ai_ready: s.aiReady,
    ai_suggestions: s.aiSuggestions,
    rubric: s.rubric,
    grading_summary: parseGradingSummary(s.gradingSummary),
    review_notes: s.reviewNotes,
    verdict: s.verdict,
    submitted_at: s.submittedAt.toISOString(),
    profiles: profile,
  };
}

async function profileFor(
  db: Db,
  studentId: string | null,
): Promise<{ display_name: string; initials: string | null } | null> {
  if (!studentId) return null;
  const rows = await db
    .select({ display_name: profiles.displayName, initials: profiles.initials })
    .from(profiles)
    .where(eq(profiles.id, studentId))
    .limit(1);
  return rows[0] ?? null;
}

/** staff: テナント内の提出物一覧 (新着順)。 */
submissionsRoute.get("/api/submissions", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const rows = await db
      .select()
      .from(submissions)
      .where(eq(submissions.tenantId, caller.tenantId))
      .orderBy(desc(submissions.submittedAt));

    // 投稿者プロフィールを 1 クエリでまとめて引く (N+1 回避)。
    const studentIds = [...new Set(rows.map((r) => r.studentId).filter((x): x is string => !!x))];
    const profMap = new Map<string, { display_name: string; initials: string | null }>();
    if (studentIds.length > 0) {
      const profileRows = await db
        .select({ id: profiles.id, displayName: profiles.displayName, initials: profiles.initials })
        .from(profiles)
        .where(inArray(profiles.id, studentIds));
      for (const p of profileRows) {
        profMap.set(p.id, { display_name: p.displayName, initials: p.initials });
      }
    }
    return c.json({
      rows: rows.map((r) => toRow(r, r.studentId ? (profMap.get(r.studentId) ?? null) : null)),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 同一課題の直近提出を 1 件引く (新しい行の attempt を決めるため)。 */
async function latestForAssignment(
  db: Db,
  tenantId: string,
  studentId: string,
  assignmentId: string,
): Promise<{ attempt: number } | null> {
  const rows = await db
    .select({ attempt: submissions.attempt })
    .from(submissions)
    .where(
      and(
        eq(submissions.tenantId, tenantId),
        eq(submissions.studentId, studentId),
        eq(submissions.assignmentId, assignmentId),
      ),
    )
    .orderBy(desc(submissions.submittedAt))
    .limit(1);
  return rows[0] ?? null;
}

interface SubmissionInput {
  lessonId: string | null;
  assignmentId: string | null;
  stageTitle: string;
  sectionTitle: string | null;
  assignmentTitle: string;
  code: string;
  priority: "high" | "normal" | "low";
  gradingSummary: GradingSummary | null;
}

/** 同一課題の未添削提出のうち最新の 1 件の id。 */
async function pendingIdForAssignment(
  db: Db,
  tenantId: string,
  studentId: string,
  assignmentId: string,
): Promise<string | undefined> {
  const rows = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(
        eq(submissions.tenantId, tenantId),
        eq(submissions.studentId, studentId),
        eq(submissions.assignmentId, assignmentId),
        eq(submissions.status, "pending"),
      ),
    )
    .orderBy(desc(submissions.submittedAt))
    .limit(1);
  return rows[0]?.id;
}

/**
 * 同一課題の未添削提出を上書きする (Issue #9)。
 *
 * 対象は **最新の 1 件だけ**。 本 PR 以前の API は同一課題の pending を複数作れたので、
 * 条件一致した行をまとめて更新すると、 既存 DB では同じ内容の行がキューに並んでしまう。
 * WHERE に `status = 'pending'` を残すのは、 id を引いてから UPDATE するまでの間に
 * 講師が添削を確定していた場合に、 確定済みの添削を巻き戻さないため (0 行 → 新規作成)。
 */
async function overwritePending(
  db: Db,
  tenantId: string,
  studentId: string,
  assignmentId: string,
  input: SubmissionInput,
): Promise<SubmissionSelect | undefined> {
  const id = await pendingIdForAssignment(db, tenantId, studentId, assignmentId);
  if (!id) return undefined;
  const updated = await db
    .update(submissions)
    .set({
      lessonId: input.lessonId,
      stageTitle: input.stageTitle,
      sectionTitle: input.sectionTitle,
      assignmentTitle: input.assignmentTitle,
      code: input.code,
      priority: input.priority,
      gradingSummary: input.gradingSummary,
      attempt: sql`${submissions.attempt} + 1`,
      submittedAt: new Date(),
      // コードが変わっているので前回の AI 下書き / 総評は捨てる。
      aiReady: false,
      aiSuggestions: [],
      rubric: [],
      reviewNotes: "",
      verdict: null,
      reviewedAt: null,
      reviewerId: null,
    })
    .where(and(eq(submissions.id, id), eq(submissions.status, "pending")))
    .returning();
  return updated[0];
}

/**
 * 新しい提出を作る。 `assignmentId` があるときは「同一課題の未添削が無い」ことを
 * 同じ 1 文に閉じ込める (NOT EXISTS)。 D1 は 1 文を原子的に実行するので、
 * 同時 POST の両方が「無い」と判断して pending が 2 行できることがない。
 *
 * 省略した列は DDL の既定値 (`ai_ready` / `ai_suggestions` / `rubric` / `review_notes`)。
 */
async function insertUnlessPending(
  db: Db,
  id: string,
  tenantId: string,
  studentId: string,
  input: SubmissionInput,
  attempt: number,
): Promise<void> {
  const summary = input.gradingSummary ? JSON.stringify(input.gradingSummary) : null;
  const values = sql`${id}, ${tenantId}, ${studentId}, ${input.lessonId}, ${input.assignmentId},
      ${input.stageTitle}, ${input.sectionTitle}, ${input.assignmentTitle}, ${input.code},
      'pending', ${input.priority}, ${attempt}, ${summary}, ${Date.now()}`;
  const guard = input.assignmentId
    ? sql`WHERE NOT EXISTS (
        SELECT 1 FROM submissions
        WHERE tenant_id = ${tenantId} AND student_id = ${studentId}
          AND assignment_id = ${input.assignmentId} AND status = 'pending'
      )`
    : sql``;
  await db.run(sql`
    INSERT INTO submissions (
      id, tenant_id, student_id, lesson_id, assignment_id,
      stage_title, section_title, assignment_title, code,
      status, priority, attempt, grading_summary, submitted_at
    )
    SELECT ${values}
    ${guard}
  `);
}

/** 競合でのやり直し上限。 1 文ずつの操作なので、 現実には 1〜2 周で収束する。 */
const MAX_SUBMISSION_ROUNDS = 3;

async function findById(db: Db, id: string): Promise<SubmissionSelect | undefined> {
  const rows = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  return rows[0];
}

/**
 * 受講者: 自分の提出を作成する。
 *
 * 同一課題に未添削 (pending) が残っている場合はその行を上書きして `attempt` を進める
 * (Issue #9)。 VS Code から詰まるたびにエスカレーションしてもキューが増殖しない。
 */
submissionsRoute.post("/api/submissions", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const body = (await c.req.json()) as {
      lessonId?: string | null;
      assignmentId?: string | null;
      stageTitle?: string;
      /**
       * TODO(stage-rename-compat): 旧拡張(<=0.1.0)互換。 拡張更新の浸透後に削除
       * 旧拡張は `courseTitle` で送る (パスは `/api/submissions` のまま変わっていない)。
       */
      courseTitle?: string;
      sectionTitle?: string | null;
      assignmentTitle: string;
      code: string;
      priority: "high" | "normal" | "low";
      attempt: number;
      gradingSummary?: unknown;
    };

    // 受講者が送る値なので、 形が違えば黙って捨てずに 400 で返す。
    if (body.gradingSummary != null && !isGradingSummary(body.gradingSummary)) {
      throw new ApiError("gradingSummary の形式が不正です", 400);
    }

    const input: SubmissionInput = {
      lessonId: body.lessonId ?? null,
      assignmentId: body.assignmentId ?? null,
      // TODO(stage-rename-compat): 旧拡張(<=0.1.0)互換。 拡張更新の浸透後に削除
      stageTitle: body.stageTitle ?? body.courseTitle ?? "",
      sectionTitle: body.sectionTitle ?? null,
      assignmentTitle: body.assignmentTitle,
      code: body.code,
      priority: body.priority,
      gradingSummary: parseGradingSummary(body.gradingSummary),
    };
    const profile = { display_name: caller.name, initials: caller.name.slice(0, 2).toUpperCase() };

    // 「上書き → 無ければ新規作成」を、 競合で 1 行も確保できなかったときだけやり直す。
    //
    // 未添削があるので INSERT を見送った直後に講師がその行を確定すると、 上書き先も
    // 消えて 1 行も取れない。 どちらの経路も単一 SQL 文なので、 やり直せば
    // 「未添削を上書き」か「新規作成」のどちらかに必ず収束する。
    for (let round = 0; round < MAX_SUBMISSION_ROUNDS; round++) {
      if (input.assignmentId) {
        const overwritten = await overwritePending(
          db,
          caller.tenantId,
          caller.id,
          input.assignmentId,
          input,
        );
        if (overwritten) {
          return c.json({ row: toRow(overwritten, profile) });
        }
      }

      const previous = input.assignmentId
        ? await latestForAssignment(db, caller.tenantId, caller.id, input.assignmentId)
        : null;
      const id = crypto.randomUUID();
      await insertUnlessPending(
        db,
        id,
        caller.tenantId,
        caller.id,
        input,
        nextSubmissionAttempt(previous, body.attempt),
      );
      const created = await findById(db, id);
      if (created) {
        return c.json({ row: toRow(created, profile) });
      }
      // 同時 POST に競り負けた。 勝った方の pending を上書きしに戻る。
    }
    throw new ApiError("提出の保存に失敗しました", 500);
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 受講者: 自分の提出一覧 (新着順)。 */
submissionsRoute.get("/api/submissions/mine", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const rows = await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.tenantId, caller.tenantId), eq(submissions.studentId, caller.id)))
      .orderBy(desc(submissions.submittedAt));

    const profile = await profileFor(db, caller.id);
    return c.json({
      rows: rows.map((r) => toRow(r, profile)),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 本人または staff: 提出物の詳細を取得。 */
submissionsRoute.get("/api/submissions/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const id = c.req.param("id");
    const rows = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
    const row = rows[0];
    if (!row) throw new ApiError("対象の提出が見つかりません", 404);
    if (row.tenantId !== caller.tenantId) {
      throw new ApiError("他テナントの提出は操作できません", 403);
    }
    const isStaff = isStaffRole(caller.role);
    const isOwner = row.studentId === caller.id;
    if (!isStaff && !isOwner) {
      throw new ApiError("この提出を閲覧する権限がありません", 403);
    }
    return c.json({ row: toRow(row, await profileFor(db, row.studentId)) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

function submissionChanged(): ApiError {
  return new ApiError("この提出は学習者が更新しました。 添削キューから開き直してください", 409);
}

/**
 * 講師が読み込んだ時点の `submitted_at` (ISO)。 解釈できない値は 400。
 * (Invalid Date のまま比較すると、 壊れた入力が 409 に化けて原因が分からなくなる)
 */
function parseExpectedSubmittedAt(value: string | undefined): Date | undefined {
  if (value === undefined) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError("expectedSubmittedAt の形式が不正です", 400);
  }
  return parsed;
}

/** staff: 提出物を更新 (添削)。 添削確定で受講者へ通知する。 */
submissionsRoute.patch("/api/submissions/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const id = c.req.param("id");

    const current = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
    const before = current[0];
    if (!before) throw new ApiError("対象の提出が見つかりません", 404);
    if (before.tenantId !== caller.tenantId) {
      throw new ApiError("他テナントの提出は操作できません", 403);
    }

    const patch = (await c.req.json()) as {
      /**
       * 講師が読み込んだ時点の `submitted_at` (ISO)。 その後に学習者が引き継ぎ直して
       * いれば 409 で弾く — 見えていないコードに添削を確定させないため (Issue #9)。
       */
      expectedSubmittedAt?: string;
      status?: "pending" | "passed" | "resubmit" | "failed";
      priority?: "high" | "normal" | "low";
      attempt?: number;
      aiReady?: boolean;
      aiSuggestions?: unknown[];
      rubric?: unknown[];
      reviewNotes?: string;
      verdict?: "pass" | "resubmit" | "fail" | null;
      code?: string;
    };

    const expected = parseExpectedSubmittedAt(patch.expectedSubmittedAt);
    if (expected && expected.getTime() !== before.submittedAt.getTime()) {
      throw submissionChanged();
    }

    const set: Partial<SubmissionSelect> = {};
    if (patch.status !== undefined) set.status = patch.status;
    if (patch.priority !== undefined) set.priority = patch.priority;
    if (patch.attempt !== undefined) set.attempt = patch.attempt;
    if (patch.aiReady !== undefined) set.aiReady = patch.aiReady;
    if (patch.aiSuggestions !== undefined) set.aiSuggestions = patch.aiSuggestions;
    if (patch.rubric !== undefined) set.rubric = patch.rubric;
    if (patch.reviewNotes !== undefined) set.reviewNotes = patch.reviewNotes;
    if (patch.verdict !== undefined) set.verdict = patch.verdict;
    if (patch.code !== undefined) set.code = patch.code;

    // status が pending 以外になったら reviewed_at を打つ (旧 patchToUpdate 相当)。
    const willReview = patch.status !== undefined && patch.status !== "pending";
    if (willReview) {
      set.reviewedAt = new Date();
      set.reviewerId = caller.id;
    }

    if (Object.keys(set).length > 0) {
      // 版チェックを UPDATE の述語に含める。 上の比較と この書き込みの間に学習者が
      // 引き継ぎ直しても、 講師が見ていないコードに添削を確定させない。
      const updated = await db
        .update(submissions)
        .set(set)
        .where(
          expected
            ? and(eq(submissions.id, id), eq(submissions.submittedAt, expected))
            : eq(submissions.id, id),
        )
        .returning();
      if (expected && !updated[0]) {
        throw submissionChanged();
      }
    }

    const after = requireReturning(
      await db.select().from(submissions).where(eq(submissions.id, id)).limit(1),
      "submission reload",
    );

    // 添削確定の初回のみ通知 (旧 notify_review_completed: old.reviewed_at is null)。
    if (before.reviewedAt == null && after.reviewedAt != null && after.studentId) {
      const verdictBody =
        after.verdict === "pass"
          ? "合格しました。 おめでとうございます。"
          : after.verdict === "resubmit"
            ? "再提出が必要です。 フィードバックを確認してください。"
            : after.verdict === "fail"
              ? "残念ながら不合格です。 フィードバックを確認してください。"
              : "フィードバックが届いています。";
      await db.insert(notifications).values({
        userId: after.studentId,
        tenantId: after.tenantId,
        type: "review_completed",
        title: `${after.assignmentTitle || "課題"} の添削が完了しました`,
        body: verdictBody,
        payload: {
          submission_id: after.id,
          verdict: after.verdict,
          status: after.status,
          stage_title: after.stageTitle,
        },
      });
    }

    // 合格の確定でこの課題のステージの修了条件が揃ったら自動でクリアにする
    // (修了証の自動発行)。逆に、合格を外す保存では自動発行の修了証を巻き戻す —
    // 誤って付けた合格が受講者を永久にクリア扱いにしないように。
    //
    // どちらを掛けるかは before との**遷移ではなく保存後の値**で決める。遷移で見ると、
    // 同じ提出への同時 PATCH が両方古い before を読んだとき (pass → fail の順で確定)、
    // fail 側が「pass から下がった」に見えず巻き戻しが走らない。保存後の値なら判定は
    // べき等 — pass 保存は発行済みなら何もせず、非 pass 保存は自動発行が残っていて
    // 条件が崩れたときだけ巻き戻すので、保存し直しがそのまま復旧手段にもなる。
    // 判定対象は提出した受講者、監査ログの actor は確定した講師。
    // best-effort — 失敗しても添削の確定は返す。
    if (patch.verdict !== undefined && after.studentId && after.lessonId) {
      const input = {
        actor: caller,
        userId: after.studentId,
        stageIds: await stageIdsOfLessons(db, [after.lessonId]),
        ip: clientIp(c),
      };
      if (after.verdict === "pass") await autoCompleteStagesIfMet(db, input);
      else await reclaimAutoCertificatesIfUnmet(db, input);
    }

    // つまずき検知 (Phase 4)。**判定が再提出 / 不合格に変わった初回だけ** 積む
    // (添削を開き直して同じ判定を保存し直すたびに走らせない)。付随処理なので
    // 失敗しても添削の応答は壊さない。
    const becameMiss =
      (after.verdict === "resubmit" || after.verdict === "fail") &&
      before.verdict !== after.verdict;
    if (becameMiss) {
      try {
        // 題名は渡さない。 `assignment_title` は受講者 (VS Code 拡張) が送った文字列
        // そのもので、 講師の待ち行列と生成プロンプトに混ぜてはいけない。 id だけ渡し、
        // 正本 (`assignments.title`) はサーバが引き直す。
        await noteSubmissionStumble(db, {
          tenantId: after.tenantId,
          lessonId: after.lessonId,
          assignmentId: after.assignmentId,
        });
      } catch (e) {
        console.error("[submissions] 発見教材リクエストの記録に失敗", e);
      }
    }

    return c.json({ row: toRow(after, await profileFor(db, after.studentId)) });
  } catch (err) {
    return errorResponse(c, err);
  }
});
