/**
 * 講師のレビュー画面のデータ (Issue #34、docs/curriculum/07 §6.3・§6.4)。
 *
 * - AI が合格にした提出の事後確認: 一覧 (講座・課題・受講者・確信度・日付で絞り込み、既定は
 *   確信度が「中」を先に) と、人ができる 3 つの操作 (確認済み・コメント・再提出に覆す)。
 * - しきい値の月次見直しに使う数字。数字を出すだけで、しきい値は自動では変えない。
 * - 同じ課題の提出を並べて見るための集計と、共通のつまずきの発見教材への回送。
 * - コメント集 (パターンごとのよくある違反と定型コメント)。
 *
 * すべてのクエリを呼び出した staff のテナントで絞る。担当の絞り込み (`assigned`) は #38 と同じく
 * 表示の絞り込みで、権限ではない (担当のいない受講者の提出を取り残さない)。
 */

import {
  isAssessmentKind,
  ROUTE_REASON_LABELS,
  ROUTE_REASONS,
  type RouteReason,
} from "@stella/shared/review/ai-review";
import {
  type AiPassedRow,
  type AiPassedState,
  type CheckAction,
  CHECK_RESULT_OF_ACTION,
  type EscalatedMetric,
  exceedsAlert,
  MAX_CHECK_COMMENT,
  MAX_TEMPLATE_BODY,
  MAX_TEMPLATE_VIOLATION,
  type PracticeMediumMetric,
  ratio,
  REVIEW_METRIC_ALERTS,
  type ReviewCommentTemplate,
  type ReviewMetrics,
  type StaffComment,
  type SubmissionCheckRecord,
  type TaskBoard,
  type TaskBoardItem,
  type TaskEscalationMetric,
} from "@stella/shared/review/review-desk";
import { ciCheckStatusFrom } from "@stella/shared/tasks/ci-run";
import { addStudyDays, studyDateStartMs } from "@stella/shared/study/activity";
import { TASK_KIND_LABELS, type TaskKind } from "@stella/shared/tasks/manifest";
import { and, asc, desc, eq, gte, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { Db } from "../db/client.js";
import {
  aiReviews,
  codingRules,
  learnerInstructors,
  notifications,
  profiles,
  reviewCommentTemplates,
  SUBMISSION_RECORD_COLUMNS,
  sections,
  stages,
  submissionChecks,
  submissions,
  tasks,
} from "../db/schema.js";
import { ApiError, type Caller } from "./authz.js";
import { upsertDiscoveryRequest } from "./discovery-data.js";
import { withResourceLock } from "./resource-lock.js";
import { reclaimAutoCertificatesIfUnmet } from "./stage-auto-complete.js";
import { reviewTaskSubmission, taskSubmissionLockId } from "./task-submission.js";

const assignee = alias(profiles, "assignee");
const reviewer = alias(profiles, "reviewer");

/**
 * 機械の照合が一致したか (`machine_check.matched`)。記録の JSON が壊れていれば NULL にする。
 * `json_extract` は不正な JSON で文ごとエラーにするので、壊れた提出が 1 件あるだけで
 * テナントの一覧・並べ見・数字がすべて 500 になってしまう (AI の想定外の失敗が上限まで続いた
 * 壊れた行も、人のキューに入る)。CASE は条件を満たした枝だけを評価する。
 */
export const machineMatchedColumn = sql<
  number | null
>`case when json_valid(${submissions.machineCheck}) then json_extract(${submissions.machineCheck}, '$.matched') end`;

/**
 * CI と公開の課題で、API が GitHub で実行を確かめた結果 (`machine_check.ci.status`、07 §5.5)。
 * CI の課題でなければ NULL。壊れた JSON も NULL にする (上と同じ理由)。
 */
export const machineCiStatusColumn = sql<
  string | null
>`case when json_valid(${submissions.machineCheck}) then json_extract(${submissions.machineCheck}, '$.ci.status') end`;

/** 呼び出した講師が担当する受講者だけに絞る条件 (#38 の `assigned=mine` と同じ)。 */
function assignedTo(caller: Caller) {
  return inArray(
    submissions.studentId,
    sql`(select ${learnerInstructors.learnerId} from ${learnerInstructors} where ${learnerInstructors.instructorId} = ${caller.id})`,
  );
}

/** 課題の講座 (ステージ)。テナントで絞って引く。 */
async function taskStage(db: Db, tenantId: string, taskId: string) {
  const [task] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      kind: tasks.kind,
      pattern: tasks.pattern,
      definition: tasks.definition,
      stageId: stages.id,
      stageTitle: stages.title,
      stageSlug: stages.slug,
    })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .where(and(eq(tasks.id, taskId), eq(stages.tenantId, tenantId)))
    .limit(1);
  return task ?? null;
}

/**
 * staff: 提出の JSON の記録のうち、壊れていて読めない列 (`SUBMISSION_RECORD_COLUMNS` の名前)。
 * 読み出しは壊れた列を null にして続ける (`safeJson`) ので、講師の画面には「読めない」ことを
 * 別に知らせる。DB の元の文字列は書き換えない。
 */
export async function brokenRecordsOf(db: Db, submissionId: string): Promise<string[]> {
  const columns = Object.fromEntries(
    SUBMISSION_RECORD_COLUMNS.map((column) => [
      column,
      sql<number>`${sql.raw(`case when ${column} is not null and not json_valid(${column}) then 1 else 0 end`)}`,
    ]),
  ) as Record<(typeof SUBMISSION_RECORD_COLUMNS)[number], SQL<number>>;
  const [row] = await db
    .select(columns)
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);
  return row ? SUBMISSION_RECORD_COLUMNS.filter((column) => Number(row[column]) === 1) : [];
}

// ---------------------------------------------------------------
// 事後確認の記録
// ---------------------------------------------------------------

/** staff: 提出の確認の記録 (新しい順)。 */
export async function submissionChecksOf(
  db: Db,
  submissionId: string,
): Promise<SubmissionCheckRecord[]> {
  const rows = await db
    .select({
      id: submissionChecks.id,
      result: submissionChecks.result,
      comment: submissionChecks.comment,
      reviewerId: submissionChecks.reviewerId,
      reviewerName: reviewer.displayName,
      createdAt: submissionChecks.createdAt,
    })
    .from(submissionChecks)
    .leftJoin(reviewer, eq(reviewer.id, submissionChecks.reviewerId))
    .where(eq(submissionChecks.submissionId, submissionId))
    .orderBy(desc(submissionChecks.createdAt));
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

/**
 * 受講者: 講師が判定を変えずに足したコメント (古い順)。覆した理由は総評 (`review_notes`) に
 * 入るので、ここには含めない。確認済みに添えたメモは講師の間の記録なので返さない。
 */
export async function staffCommentsOf(db: Db, submissionId: string): Promise<StaffComment[]> {
  const rows = await db
    .select({ comment: submissionChecks.comment, createdAt: submissionChecks.createdAt })
    .from(submissionChecks)
    .where(
      and(
        eq(submissionChecks.submissionId, submissionId),
        eq(submissionChecks.result, "commented"),
      ),
    )
    .orderBy(asc(submissionChecks.createdAt));
  return rows.map((r) => ({ comment: r.comment, createdAt: r.createdAt.toISOString() }));
}

/**
 * AI が合格にした提出への、人の 3 つの操作 (07 §6.4 の 6)。
 *
 * - confirm: 確認済みにする (添えたメモは講師の間の記録で、受講者には返さない)。
 * - comment: 判定を変えずにコメントを足し、受講者へ通知する。
 * - overturn: 再提出に覆す。人の確定と同じ処理 (`reviewTaskSubmission`) で、この提出の合格と
 *   スキルの証拠だけを取り消し、理由を受講者へ通知する。修了の自動発行も条件が崩れれば戻す。
 *
 * どれも課題のロックの中で「AI の合格のまま」かを確かめる (先に覆された提出には足さない)。
 */
export async function checkAiPassedSubmission(
  db: Db,
  caller: Caller,
  submissionId: string,
  input: { action: CheckAction; comment: string },
  ip: string | null = null,
): Promise<SubmissionCheckRecord[]> {
  const [initial] = await db
    .select({
      tenantId: submissions.tenantId,
      studentId: submissions.studentId,
      taskId: submissions.taskId,
    })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);
  if (!initial || initial.tenantId !== caller.tenantId)
    throw new ApiError("対象の提出が見つかりません", 404);
  if (!initial.taskId || !initial.studentId)
    throw new ApiError("AI が合格にした課題の提出だけを確認できます", 400);
  const comment = input.comment.trim();
  if (comment.length > MAX_CHECK_COMMENT)
    throw new ApiError(`コメントは ${MAX_CHECK_COMMENT} 文字以内にしてください`, 400);
  if (input.action !== "confirm" && !comment)
    throw new ApiError(
      input.action === "overturn" ? "覆す理由を書いてください" : "コメントを書いてください",
      400,
    );

  if (input.action === "overturn") {
    await reviewTaskSubmission(db, caller, submissionId, "resubmit", comment, "human", {
      requireAiPass: true,
    });
    const task = await taskStage(db, caller.tenantId, initial.taskId);
    if (task)
      await reclaimAutoCertificatesIfUnmet(db, {
        actor: caller,
        userId: initial.studentId,
        stageIds: [task.stageId],
        ip,
      });
    return submissionChecksOf(db, submissionId);
  }

  const { studentId, taskId } = initial;
  const locked = await withResourceLock(
    db,
    taskSubmissionLockId(caller.tenantId, studentId, taskId),
    async () => {
      const [row] = await db
        .select({
          verdict: submissions.verdict,
          reviewSource: submissions.reviewSource,
          assignmentTitle: submissions.assignmentTitle,
          stageTitle: submissions.stageTitle,
        })
        .from(submissions)
        .where(eq(submissions.id, submissionId))
        .limit(1);
      if (row?.verdict !== "pass" || row.reviewSource !== "ai")
        throw new ApiError("この提出はもう AI の合格ではありません。提出を開き直してください", 409);
      const [review] = await db
        .select({ id: aiReviews.id })
        .from(aiReviews)
        .where(
          and(
            eq(aiReviews.submissionId, submissionId),
            eq(aiReviews.outcome, "confirmed"),
            eq(aiReviews.disposition, "applied"),
          ),
        )
        .orderBy(desc(aiReviews.createdAt))
        .limit(1);
      const now = new Date();
      const checkId = crypto.randomUUID();
      const insertCheck = db.insert(submissionChecks).values({
        id: checkId,
        tenantId: caller.tenantId,
        submissionId,
        aiReviewId: review?.id ?? null,
        reviewerId: caller.id,
        result: CHECK_RESULT_OF_ACTION[input.action],
        comment,
        createdAt: now,
      });
      if (input.action === "comment")
        await db.batch([
          insertCheck,
          db.insert(notifications).values({
            userId: studentId,
            tenantId: caller.tenantId,
            type: "review_comment",
            title: `${row.assignmentTitle || "課題"} に講師がコメントしました`,
            body: comment.slice(0, 500),
            payload: {
              submission_id: submissionId,
              check_id: checkId,
              stage_title: row.stageTitle,
            },
            createdAt: now,
          }),
        ]);
      else await insertCheck;
    },
    { ttlMs: 120_000 },
  );
  if (!locked.ran) throw new ApiError("別の提出・レビューを保存中です", 409);
  return submissionChecksOf(db, submissionId);
}

// ---------------------------------------------------------------
// AI が合格にした提出の一覧
// ---------------------------------------------------------------

export interface AiPassedFilters {
  stageId?: string;
  taskId?: string;
  learnerId?: string;
  confidence?: "high" | "medium";
  /** AI が合格にした日 (学習日 = JST、両端を含む)。 */
  from?: string;
  to?: string;
  state: AiPassedState;
  assignedOnly: boolean;
  limit: number;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 一覧の絞り込みを検証する。 */
export function parseAiPassedFilters(query: Record<string, string | undefined>): AiPassedFilters {
  const { stageId, taskId, learnerId, confidence, from, to, state, assigned, limit } = query;
  if (confidence !== undefined && confidence !== "high" && confidence !== "medium")
    throw new ApiError("confidence には high か medium を指定してください", 400);
  if (state !== undefined && state !== "unchecked" && state !== "checked" && state !== "all")
    throw new ApiError("state には unchecked・checked・all を指定してください", 400);
  if (assigned !== undefined && assigned !== "mine")
    throw new ApiError("assigned には mine だけを指定できます", 400);
  for (const date of [from, to])
    if (date !== undefined && !DATE.test(date))
      throw new ApiError("from・to は YYYY-MM-DD で指定してください", 400);
  const size = limit === undefined ? 200 : Number(limit);
  if (!Number.isInteger(size) || size < 1 || size > 500)
    throw new ApiError("limit は 1〜500 で指定してください", 400);
  return {
    ...(stageId ? { stageId } : {}),
    ...(taskId ? { taskId } : {}),
    ...(learnerId ? { learnerId } : {}),
    ...(confidence ? { confidence } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    state: state ?? "all",
    assignedOnly: assigned === "mine",
    limit: size,
  };
}

const checkCountColumn = sql<number>`(select count(*) from submission_checks c where c.submission_id = "submissions"."id")`;
const lastCheck = (column: "result" | "created_at") =>
  sql.raw(
    `(select c.${column} from submission_checks c where c.submission_id = "submissions"."id" order by c.created_at desc limit 1)`,
  );

/**
 * staff: AI が合格にした提出の一覧。期間は限らない (07 §6.4 の 6)。
 * 確信度が「中」を先に、その中は AI が合格にした日時の新しい順に並べる。覆した提出も残す
 * (今の判定と確認の記録で見分ける)。
 */
export async function listAiPassed(
  db: Db,
  caller: Caller,
  filters: AiPassedFilters,
): Promise<{ rows: AiPassedRow[]; truncated: boolean }> {
  const conditions: (SQL | undefined)[] = [
    eq(submissions.tenantId, caller.tenantId),
    eq(stages.tenantId, caller.tenantId),
    eq(submissions.aiReviewStatus, "confirmed"),
    filters.stageId ? eq(stages.id, filters.stageId) : undefined,
    filters.taskId ? eq(submissions.taskId, filters.taskId) : undefined,
    filters.learnerId ? eq(submissions.studentId, filters.learnerId) : undefined,
    filters.confidence ? eq(aiReviews.confidence, filters.confidence) : undefined,
    filters.from ? gte(aiReviews.appliedAt, new Date(studyDateStartMs(filters.from))) : undefined,
    filters.to
      ? lt(aiReviews.appliedAt, new Date(studyDateStartMs(addStudyDays(filters.to, 1))))
      : undefined,
    filters.state === "unchecked"
      ? sql`not exists (select 1 from submission_checks c where c.submission_id = "submissions"."id")`
      : filters.state === "checked"
        ? sql`exists (select 1 from submission_checks c where c.submission_id = "submissions"."id")`
        : undefined,
    filters.assignedOnly ? assignedTo(caller) : undefined,
  ];
  const rows = await db
    .select({
      submissionId: submissions.id,
      studentId: submissions.studentId,
      studentName: profiles.displayName,
      stageId: stages.id,
      stageTitle: stages.title,
      taskId: tasks.id,
      taskTitle: tasks.title,
      taskKind: submissions.taskKind,
      confidence: aiReviews.confidence,
      aiPassedAt: aiReviews.appliedAt,
      submittedAt: submissions.submittedAt,
      verdict: submissions.verdict,
      checkCount: checkCountColumn,
      lastResult: sql<string | null>`${lastCheck("result")}`,
      lastAt: sql<number | null>`${lastCheck("created_at")}`,
      lastReviewer: sql<
        string | null
      >`(select p.display_name from submission_checks c left join profiles p on p.id = c.reviewer_id where c.submission_id = "submissions"."id" order by c.created_at desc limit 1)`,
      assigneeId: learnerInstructors.instructorId,
      assigneeName: assignee.displayName,
    })
    .from(submissions)
    .innerJoin(
      aiReviews,
      and(
        eq(aiReviews.submissionId, submissions.id),
        eq(aiReviews.outcome, "confirmed"),
        eq(aiReviews.disposition, "applied"),
      ),
    )
    .innerJoin(tasks, eq(tasks.id, submissions.taskId))
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .leftJoin(profiles, eq(profiles.id, submissions.studentId))
    .leftJoin(learnerInstructors, eq(learnerInstructors.learnerId, submissions.studentId))
    .leftJoin(assignee, eq(assignee.id, learnerInstructors.instructorId))
    .where(and(...conditions))
    .orderBy(
      sql`case ${aiReviews.confidence} when 'medium' then 0 else 1 end`,
      desc(aiReviews.appliedAt),
      desc(submissions.submittedAt),
    )
    .limit(filters.limit + 1);
  return {
    truncated: rows.length > filters.limit,
    rows: rows.slice(0, filters.limit).map((r) => ({
      submissionId: r.submissionId,
      studentId: r.studentId,
      studentName: r.studentName ?? "受講者",
      stageId: r.stageId,
      stageTitle: r.stageTitle,
      taskId: r.taskId,
      taskTitle: r.taskTitle,
      taskKind: r.taskKind,
      confidence: r.confidence,
      aiPassedAt: r.aiPassedAt?.toISOString() ?? null,
      submittedAt: r.submittedAt.toISOString(),
      verdict: r.verdict,
      checkCount: Number(r.checkCount),
      lastCheck:
        r.lastResult && r.lastAt !== null
          ? {
              result: r.lastResult as SubmissionCheckRecord["result"],
              reviewerName: r.lastReviewer,
              createdAt: new Date(Number(r.lastAt)).toISOString(),
            }
          : null,
      assigneeId: r.assigneeId,
      assigneeName: r.assigneeName,
    })),
  };
}

// ---------------------------------------------------------------
// しきい値の月次見直しに使う数字 (07 §6.3)
// ---------------------------------------------------------------

/** 練習 (基礎・接続・自力・修正) の種別。統合・確認A・Bは証拠になる課題なので外す。 */
const PRACTICE_KINDS = ["basic", "connection", "independent", "debug"] as const;

/** 人に回した提出の、最新の AI の結果の理由 (記録が無ければ提出の時点で分かる理由)。 */
function reasonsOf(raw: string | null, fallback: RouteReason[]): RouteReason[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const reasons = parsed.filter((r): r is RouteReason =>
          ROUTE_REASONS.includes(r as RouteReason),
        );
        if (reasons.length > 0) return reasons;
      }
    } catch {
      // 壊れた記録は、提出の時点で分かる理由に倒す。
    }
  }
  return fallback;
}

/**
 * AI の記録がまだ無い、人に回した提出の理由。提出の時点で人に回す条件 (相談・照合の食い違い・
 * 確認A・Bの支援) だけを、一覧に載せている列から決める (`forcedHumanReasons` と同じ順)。
 */
export function submittedRouteReasons(input: {
  taskKind: string | null;
  submissionMode: string | null;
  machineMatched: number | null;
  /** `machine_check.ci.status`。CI の課題でなければ null。 */
  machineCiStatus?: string | null;
}): RouteReason[] {
  const reasons: RouteReason[] = [];
  if (input.submissionMode === "consult") reasons.push("consult");
  else if (input.machineMatched !== 1) reasons.push("machine-check");
  // CI の照合 (07 §5.5)。食い違いと照合できなかったものを分ける (`forcedHumanReasons` と同じ)。
  const ci = ciCheckStatusFrom(
    input.machineCiStatus == null ? null : { status: input.machineCiStatus },
  );
  if (ci === "mismatch") reasons.push("ci-mismatch");
  else if (ci === "unverifiable") reasons.push("ci-unverified");
  if (reasons.length === 0 && isAssessmentKind(input.taskKind ?? ""))
    reasons.push("unallowed-support");
  return reasons;
}

/** staff: しきい値の月次見直しに使う数字。直近 `days` 日の提出・判定を数える。 */
export async function reviewMetrics(
  db: Db,
  tenantId: string,
  days: number,
  now = Date.now(),
): Promise<ReviewMetrics> {
  const since = new Date(now - days * 24 * 60 * 60 * 1000);

  // 1. 練習の「中」で AI が合格にした提出のうち、人が覆した割合 (講座ごと)。
  const medium = await db
    .select({
      stageId: stages.id,
      stageTitle: stages.title,
      aiPassed: sql<number>`count(*)`,
      checked: sql<number>`sum(case when exists (select 1 from submission_checks c where c.submission_id = ${aiReviews.submissionId}) then 1 else 0 end)`,
      overturned: sql<number>`sum(case when exists (select 1 from submission_checks c where c.submission_id = ${aiReviews.submissionId} and c.result = 'overturned') then 1 else 0 end)`,
    })
    .from(aiReviews)
    .innerJoin(tasks, eq(tasks.id, aiReviews.taskId))
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .where(
      and(
        eq(aiReviews.tenantId, tenantId),
        eq(stages.tenantId, tenantId),
        eq(aiReviews.outcome, "confirmed"),
        eq(aiReviews.disposition, "applied"),
        eq(aiReviews.confidence, "medium"),
        inArray(aiReviews.taskKind, [...PRACTICE_KINDS]),
        gte(aiReviews.appliedAt, since),
      ),
    )
    .groupBy(stages.id, stages.title)
    .orderBy(stages.title);
  const practiceMedium: PracticeMediumMetric[] = medium.map((m) => {
    const rate = ratio(Number(m.overturned), Number(m.checked));
    return {
      stageId: m.stageId,
      stageTitle: m.stageTitle,
      aiPassed: Number(m.aiPassed),
      checked: Number(m.checked),
      overturned: Number(m.overturned),
      rate,
      exceeds: exceedsAlert(rate, REVIEW_METRIC_ALERTS.practiceMediumOverturned),
    };
  });

  // 2. 人に回した提出のうち、人がそのまま合格にした割合 (種別ごと・理由ごと)。
  const decided = await db
    .select({
      taskKind: submissions.taskKind,
      verdict: submissions.verdict,
      submissionMode: submissions.submissionMode,
      machineMatched: machineMatchedColumn,
      machineCiStatus: machineCiStatusColumn,
      reasons: sql<
        string | null
      >`(select r.route_reasons from ai_reviews r where r.submission_id = "submissions"."id" and r.outcome = 'escalated' order by r.created_at desc limit 1)`,
    })
    .from(submissions)
    .where(
      and(
        eq(submissions.tenantId, tenantId),
        eq(submissions.aiReviewStatus, "escalated"),
        eq(submissions.reviewSource, "human"),
        gte(submissions.reviewedAt, since),
      ),
    );
  const byKind = new Map<string, { decided: number; passed: number }>();
  const byReason = new Map<RouteReason, { decided: number; passed: number }>();
  const bump = <K>(map: Map<K, { decided: number; passed: number }>, key: K, passed: boolean) => {
    const entry = map.get(key) ?? { decided: 0, passed: 0 };
    entry.decided++;
    if (passed) entry.passed++;
    map.set(key, entry);
  };
  for (const row of decided) {
    const passed = row.verdict === "pass";
    bump(byKind, row.taskKind ?? "basic", passed);
    for (const reason of reasonsOf(row.reasons, submittedRouteReasons(row)))
      bump(byReason, reason, passed);
  }
  const escalated = (key: string, label: string, v: { decided: number; passed: number }) => {
    const rate = ratio(v.passed, v.decided);
    return {
      key,
      label,
      decided: v.decided,
      passedAsIs: v.passed,
      rate,
      exceeds: exceedsAlert(rate, REVIEW_METRIC_ALERTS.escalatedPassedAsIs),
    } satisfies EscalatedMetric;
  };
  const kindOrder = Object.keys(TASK_KIND_LABELS);
  const escalatedByKind = [...byKind.entries()]
    .sort(([a], [b]) => kindOrder.indexOf(a) - kindOrder.indexOf(b))
    .map(([kind, v]) => escalated(kind, TASK_KIND_LABELS[kind as TaskKind] ?? kind, v));
  const escalatedByReason = ROUTE_REASONS.filter((r) => byReason.has(r)).map((reason) =>
    escalated(
      reason,
      ROUTE_REASON_LABELS[reason],
      byReason.get(reason) ?? { decided: 0, passed: 0 },
    ),
  );

  // 3. 課題ごとの、人に回した割合 (AI が判定した提出のうち)。AI の結果を提出に当てた提出
  //    (`disposition = 'applied'`) だけを数え、人に回したかは当てた結果で決める。相談や照合の
  //    食い違いは AI の処理の前から「人に回した」状態になるので、状態だけで数えると AI が判定して
  //    いない提出まで入る (AI が処理して当てたあとは、人に回した提出に含める)。置き換えた試行と
  //    人が先に確定した試行は数えない。
  const appliedAi = alias(aiReviews, "applied_ai");
  const perTask = await db
    .select({
      taskId: tasks.id,
      taskTitle: tasks.title,
      stageTitle: stages.title,
      reviewed: sql<number>`count(*)`,
      escalated: sql<number>`sum(case when ${appliedAi.outcome} = 'escalated' then 1 else 0 end)`,
    })
    .from(submissions)
    .innerJoin(
      appliedAi,
      sql`${appliedAi.id} = (select r.id from ai_reviews r where r.submission_id = "submissions"."id" and r.disposition = 'applied' order by r.created_at desc limit 1)`,
    )
    .innerJoin(tasks, eq(tasks.id, submissions.taskId))
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .where(
      and(
        eq(submissions.tenantId, tenantId),
        eq(stages.tenantId, tenantId),
        inArray(submissions.aiReviewStatus, ["confirmed", "escalated"]),
        gte(submissions.submittedAt, since),
      ),
    )
    .groupBy(tasks.id, tasks.title, stages.title);
  const taskEscalation: TaskEscalationMetric[] = perTask
    .map((t) => {
      const rate = ratio(Number(t.escalated), Number(t.reviewed));
      return {
        taskId: t.taskId,
        taskTitle: t.taskTitle,
        stageTitle: t.stageTitle,
        reviewed: Number(t.reviewed),
        escalated: Number(t.escalated),
        rate,
        exceeds: exceedsAlert(rate, REVIEW_METRIC_ALERTS.taskEscalated),
      };
    })
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || b.reviewed - a.reviewed);

  return {
    days,
    since: since.toISOString(),
    practiceMedium,
    escalatedByKind,
    escalatedByReason,
    taskEscalation,
  };
}

// ---------------------------------------------------------------
// 同じ課題の提出を並べて見る (07 §6.4 の 5)
// ---------------------------------------------------------------

interface TaskDefinitionReview {
  review?: {
    rules?: { id: string; required: boolean }[];
    rubric?: { id: string; criterion: string; required: boolean }[];
  };
}

/** 課題のルーブリックの項目 (規則の項目は規則の本文で)。 */
async function rubricItemsOf(db: Db, definition: string) {
  let parsed: TaskDefinitionReview;
  try {
    parsed = JSON.parse(definition) as TaskDefinitionReview;
  } catch {
    return [];
  }
  const rules = parsed.review?.rules ?? [];
  const texts = rules.length
    ? await db
        .select({ id: codingRules.id, statement: codingRules.statement })
        .from(codingRules)
        .where(
          inArray(
            codingRules.id,
            rules.map((r) => r.id),
          ),
        )
    : [];
  return [
    ...rules.map((r) => ({
      id: r.id,
      criterion: texts.find((t) => t.id === r.id)?.statement ?? r.id,
      required: r.required,
    })),
    ...(parsed.review?.rubric ?? []).map((r) => ({
      id: r.id,
      criterion: r.criterion,
      required: r.required,
    })),
  ];
}

/** 一覧に載せる受講者の上限 (最新の提出の新しい順)。 */
const TASK_BOARD_LIMIT = 200;

/**
 * staff: 同じ課題の、受講者ごとの最新の提出と AI のルーブリックの結果。項目ごとに「満たさない」を
 * 数え、共通のつまずきを見つけられるようにする。提出ファイルは各提出の詳細で読む。
 */
export async function taskBoard(
  db: Db,
  caller: Caller,
  taskId: string,
  assignedOnly: boolean,
): Promise<TaskBoard> {
  const task = await taskStage(db, caller.tenantId, taskId);
  if (!task) throw new ApiError("課題が見つかりません", 404);
  const items = await rubricItemsOf(db, task.definition);
  const rows = await db
    .select({
      submissionId: submissions.id,
      studentId: submissions.studentId,
      studentName: profiles.displayName,
      attempt: submissions.attempt,
      submittedAt: submissions.submittedAt,
      verdict: submissions.verdict,
      reviewSource: submissions.reviewSource,
      aiReviewStatus: submissions.aiReviewStatus,
      taskKind: submissions.taskKind,
      submissionMode: submissions.submissionMode,
      machineMatched: machineMatchedColumn,
      machineCiStatus: machineCiStatusColumn,
      confidence: aiReviews.confidence,
      routeReasons: aiReviews.routeReasons,
      rubricResults: aiReviews.rubricResults,
      findings: aiReviews.findings,
    })
    .from(submissions)
    .leftJoin(profiles, eq(profiles.id, submissions.studentId))
    .leftJoin(
      aiReviews,
      sql`${aiReviews.id} = (select x.id from ai_reviews x where x.submission_id = "submissions"."id" order by x.created_at desc limit 1)`,
    )
    .where(
      and(
        eq(submissions.tenantId, caller.tenantId),
        eq(submissions.taskId, taskId),
        sql`${submissions.attempt} = (select max(m.attempt) from submissions m where m.tenant_id = "submissions"."tenant_id" and m.student_id = "submissions"."student_id" and m.task_id = "submissions"."task_id")`,
        assignedOnly ? assignedTo(caller) : undefined,
      ),
    )
    .orderBy(desc(submissions.submittedAt))
    .limit(TASK_BOARD_LIMIT);
  const counts = new Map<string, TaskBoardItem>(
    items.map((item) => [item.id, { ...item, current: true, met: 0, unmet: 0, undetermined: 0 }]),
  );
  const boardSubmissions = rows.map((r) => {
    const rubric: Record<string, "met" | "unmet" | "undetermined"> = {};
    for (const result of r.rubricResults ?? []) {
      rubric[result.id] = result.result;
      // ルーブリックを改訂して今の版に無い項目 (改名・削除) も、AI の結果に残る判定時の題名で
      // 「前の版の項目」として数える (今の版の項目だけに足すと、過去の未達が集計から消える)。
      let count = counts.get(result.id);
      if (!count) {
        count = {
          id: result.id,
          criterion: result.criterion,
          required: result.required,
          current: false,
          met: 0,
          unmet: 0,
          undetermined: 0,
        };
        counts.set(result.id, count);
      }
      count[result.result]++;
    }
    return {
      submissionId: r.submissionId,
      studentId: r.studentId,
      studentName: r.studentName ?? "受講者",
      attempt: r.attempt,
      submittedAt: r.submittedAt.toISOString(),
      verdict: r.verdict,
      reviewSource: r.reviewSource,
      aiReviewStatus: r.aiReviewStatus,
      confidence: r.confidence,
      routeReasons:
        r.routeReasons ??
        (r.aiReviewStatus === "escalated" ? submittedRouteReasons(r) : ([] as RouteReason[])),
      rubric,
      findingCount: r.findings?.length ?? 0,
    };
  });
  return {
    task: {
      id: task.id,
      title: task.title,
      kind: task.kind,
      pattern: task.pattern,
      stageId: task.stageId,
      stageTitle: task.stageTitle,
    },
    submissions: boardSubmissions,
    // 今の版の項目 (定義の順) を先に、前の版の項目をあとに並べる。
    items: [...counts.values()].sort((a, b) => Number(b.current) - Number(a.current)),
  };
}

/**
 * staff: 共通のつまずきを発見教材の待ち行列に回す。題名は D1 の正本 (課題名とルーブリックの
 * 項目) だけで組む (`discovery-stumble.ts` と同じく、受講者が送った文字列を混ぜない)。
 * 下書きは発見教材の画面で作る。
 */
export async function routeTaskToDiscovery(
  db: Db,
  caller: Caller,
  taskId: string,
  rubricId: string | null,
): Promise<{ topic: string; stageId: string }> {
  const task = await taskStage(db, caller.tenantId, taskId);
  if (!task) throw new ApiError("課題が見つかりません", 404);
  let topic = `課題「${task.title}」`;
  if (rubricId) {
    const item = (await rubricItemsOf(db, task.definition)).find((i) => i.id === rubricId);
    if (!item) throw new ApiError("ルーブリックの項目が見つかりません", 400);
    topic = `${topic}: ${item.criterion}`;
  }
  await upsertDiscoveryRequest(db, {
    tenantId: caller.tenantId,
    stageId: task.stageId,
    topic,
    origin: "review_common",
  });
  return { topic, stageId: task.stageId };
}

// ---------------------------------------------------------------
// コメント集 (07 §6.4 の 4)
// ---------------------------------------------------------------

function toTemplate(row: {
  id: string;
  stageId: string | null;
  pattern: string | null;
  ruleId: string | null;
  violation: string;
  body: string;
  createdByName: string | null;
  updatedAt: Date;
}): ReviewCommentTemplate {
  return { ...row, updatedAt: row.updatedAt.toISOString() };
}

const templateColumns = {
  id: reviewCommentTemplates.id,
  stageId: reviewCommentTemplates.stageId,
  pattern: reviewCommentTemplates.pattern,
  ruleId: reviewCommentTemplates.ruleId,
  violation: reviewCommentTemplates.violation,
  body: reviewCommentTemplates.body,
  createdByName: reviewer.displayName,
  updatedAt: reviewCommentTemplates.updatedAt,
};

/**
 * staff: 定型コメント。`stageId` (と `pattern`) を渡すと、その課題に当てはまるもの (講座・
 * パターンが合うか、指定が無いもの) だけを返す。
 */
export async function listTemplates(
  db: Db,
  caller: Caller,
  scope: { stageId?: string; pattern?: string },
): Promise<ReviewCommentTemplate[]> {
  const rows = await db
    .select(templateColumns)
    .from(reviewCommentTemplates)
    .leftJoin(reviewer, eq(reviewer.id, reviewCommentTemplates.createdBy))
    .where(
      and(
        eq(reviewCommentTemplates.tenantId, caller.tenantId),
        scope.stageId
          ? or(
              isNull(reviewCommentTemplates.stageId),
              eq(reviewCommentTemplates.stageId, scope.stageId),
            )
          : undefined,
        scope.pattern
          ? or(
              isNull(reviewCommentTemplates.pattern),
              eq(reviewCommentTemplates.pattern, scope.pattern),
            )
          : undefined,
      ),
    )
    .orderBy(reviewCommentTemplates.pattern, reviewCommentTemplates.violation);
  return rows.map(toTemplate);
}

export interface TemplateInput {
  stageId?: string | null;
  pattern?: string | null;
  ruleId?: string | null;
  violation?: string;
  body?: string;
}

function optionalText(value: unknown, name: string, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string" || value.length > max)
    throw new ApiError(`${name} は ${max} 文字以内の文字列にしてください`, 400);
  return value.trim() || null;
}

/** 定型コメントの入力を検証する。`partial` なら省略した項目は変えない。 */
export function parseTemplateInput(raw: unknown, partial: boolean): TemplateInput {
  if (!raw || typeof raw !== "object") throw new ApiError("定型コメントの形式が不正です", 400);
  const body = raw as Record<string, unknown>;
  const violation = optionalText(body.violation, "よくある違反", MAX_TEMPLATE_VIOLATION);
  const text = optionalText(body.body, "定型コメント", MAX_TEMPLATE_BODY);
  if (!partial && (!violation || !text))
    throw new ApiError("よくある違反と定型コメントを書いてください", 400);
  if (partial && (violation === null || text === null))
    throw new ApiError("よくある違反と定型コメントは空にできません", 400);
  return {
    ...(body.stageId !== undefined
      ? { stageId: optionalText(body.stageId, "stageId", 200) ?? null }
      : {}),
    ...(body.pattern !== undefined
      ? { pattern: optionalText(body.pattern, "pattern", 200) ?? null }
      : {}),
    ...(body.ruleId !== undefined
      ? { ruleId: optionalText(body.ruleId, "ruleId", 100) ?? null }
      : {}),
    ...(violation ? { violation } : {}),
    ...(text ? { body: text } : {}),
  };
}

/** 講座がこのテナントのものか (他テナントの講座に定型コメントを付けさせない)。 */
async function assertStage(db: Db, tenantId: string, stageId: string | null | undefined) {
  if (!stageId) return;
  const [stage] = await db
    .select({ id: stages.id })
    .from(stages)
    .where(and(eq(stages.id, stageId), eq(stages.tenantId, tenantId)))
    .limit(1);
  if (!stage) throw new ApiError("講座が見つかりません", 400);
}

async function templateById(db: Db, caller: Caller, id: string) {
  const [row] = await db
    .select(templateColumns)
    .from(reviewCommentTemplates)
    .leftJoin(reviewer, eq(reviewer.id, reviewCommentTemplates.createdBy))
    .where(
      and(eq(reviewCommentTemplates.id, id), eq(reviewCommentTemplates.tenantId, caller.tenantId)),
    )
    .limit(1);
  if (!row) throw new ApiError("定型コメントが見つかりません", 404);
  return toTemplate(row);
}

export async function createTemplate(db: Db, caller: Caller, input: TemplateInput) {
  await assertStage(db, caller.tenantId, input.stageId);
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(reviewCommentTemplates).values({
    id,
    tenantId: caller.tenantId,
    stageId: input.stageId ?? null,
    pattern: input.pattern ?? null,
    ruleId: input.ruleId ?? null,
    violation: input.violation ?? "",
    body: input.body ?? "",
    createdBy: caller.id,
    createdAt: now,
    updatedAt: now,
  });
  return templateById(db, caller, id);
}

export async function updateTemplate(db: Db, caller: Caller, id: string, input: TemplateInput) {
  await templateById(db, caller, id);
  await assertStage(db, caller.tenantId, input.stageId);
  if (Object.keys(input).length > 0)
    await db
      .update(reviewCommentTemplates)
      .set({ ...input, updatedAt: new Date() })
      .where(
        and(
          eq(reviewCommentTemplates.id, id),
          eq(reviewCommentTemplates.tenantId, caller.tenantId),
        ),
      );
  return templateById(db, caller, id);
}

export async function deleteTemplate(db: Db, caller: Caller, id: string) {
  await templateById(db, caller, id);
  await db
    .delete(reviewCommentTemplates)
    .where(
      and(eq(reviewCommentTemplates.id, id), eq(reviewCommentTemplates.tenantId, caller.tenantId)),
    );
}
