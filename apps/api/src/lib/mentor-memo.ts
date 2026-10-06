/**
 * 週次の育成メモ (#38・07 §6.5)。担当講師が 5 分で読み、一言の声掛けかペースの調整をする。
 *
 * 1. 積む: 15分の cron が、担当のいる受講者ごとに前の週 (月曜〜日曜、日本時間) の行を積む。
 *    受講者・週で一意なので、何度積んでも 1 枚 (`enqueueWeeklyMemos`)。
 * 2. 書く: 同じ cron が数件ずつリースを取り、材料を集めて AI に書かせる (`processMentorMemoQueue`)。
 *    材料は数字と課題・スキル・評価項目の名前だけで、受講者の名前・メール・コードは渡さない。
 *    API キーが無い・拒否・形式の誤りは機械的な要約で確定し、時間切れ・一時的な失敗は 3 回まで
 *    次の cron でやり直す (最後は機械的な要約)。
 *
 * Message Batches API は使わない。週に受講者 1 人 1 回と量が少なく費用の差は小さい一方、
 * 材料集め (1 人あたり十数クエリ) は cron の D1 のクエリ上限を他の処理と分け合うので、どのみち
 * 数件ずつ分けて回す必要がある。Batch にすると、材料を集め終えるまでの待ち・バッチ ID の
 * 保存と回収・期限切れの扱いが増える。受講者が待つ処理ではないので、数件ずつで足りる。
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  buildFallbackMemo,
  MEMO_ACTIONS,
  type MemoAction,
  MENTOR_MEMO_OUTPUT_SCHEMA,
  type MentorMemoMaterial,
  type MentorMemoOutput,
  type MentorMemoView,
  parseMentorMemoOutput,
  STUMBLE_SIGNALS,
  type StumbleSignal,
} from "@stella/shared/mentoring/weekly-memo";
import type { RouteReason } from "@stella/shared/review/ai-review";
import { addStudyDays, studyDateStartMs, toStudyDate } from "@stella/shared/study/activity";
import { studyWeekStart } from "@stella/shared/study/pace";
import { SUPPORT_KINDS } from "@stella/shared/tasks/submission-support";
import {
  CONSULT_SUPPORT_DETAIL,
  type EvidenceLevel,
  RECORDED_SUPPORT_KINDS,
  type SupportRecordKind,
} from "@stella/shared/tasks/support-record";
import { and, asc, desc, eq, exists, gte, isNull, lt, lte, notExists, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { Db } from "../db/client.js";
import {
  aiReviews,
  enrollments,
  learnerInstructors,
  mentorMemos,
  notifications,
  profiles,
  sections,
  skillEvidence,
  skills,
  stages,
  studyActivity,
  submissionReviews,
  submissions,
  taskLocalRuns,
  taskProgress,
  taskSupportEvents,
  tasks,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { MissingGatewayConfigError } from "./ai-gateway.js";
import { completeJsonSchema, resolveAnthropicModel } from "./anthropic-complete.js";
import { MissingApiKeyError } from "./anthropic.js";
import type { Caller } from "./authz.js";
import { chunk, rowsPerInsert } from "./enrollment-bulk.js";
import { loadLearningPace } from "./learning-pace.js";
import { buildMentorMemoPrompt, MENTOR_MEMO_PROMPT_VERSION } from "./mentor-memo-prompt.js";
import { stumbleIdRange } from "./stumble-alerts.js";

/** 1 回の cron で書くメモの数。AI の一次レビューと AI の呼び出し・D1 のクエリを分け合う。 */
export const MEMOS_PER_RUN = 5;
/** AI の呼び出しをやり直す上限。超えたら機械的な要約で確定する。 */
export const MAX_MEMO_ATTEMPTS = 3;
/** cron の AI 1 回あたりの待ち時間。 */
export const MEMO_AI_TIMEOUT_MS = 60_000;
/** やり直しまでの間隔 (次の cron で拾う)。 */
const RETRY_DELAY_MS = 10 * 60_000;
/** AI の応答の上限。メモは数百字なので十分に収まる。 */
const MAX_OUTPUT_TOKENS = 8_000;
/** 続いている手元の失敗として材料に載せる回数の下限。 */
const STREAK_MIN = 3;

/** 今日の時点でメモを書く週 (前の週の月曜)。 */
export function memoWeekOf(today: string): string {
  return addStudyDays(studyWeekStart(today), -7);
}

/** cron が止まって積み損ねた週をさかのぼる上限 (前の週を含めた週の数)。 */
export const MEMO_BACKFILL_WEEKS = 4;

/**
 * 前の週のメモを積む。cron が週をまたいで止まっていたときのために、直近
 * `MEMO_BACKFILL_WEEKS` 週のうちまだ無い週も積む。ただしさかのぼるのは、そのテナントで最初に
 * メモを作った週 (機能を入れた週) より後の週だけ。メモが 1 枚も無いテナント (初めてのデプロイ) は
 * 前の週だけにして、過去の週をまとめて作らない。
 */
export async function enqueueWeeklyMemos(db: Db, now = new Date()): Promise<number> {
  const latest = memoWeekOf(toStudyDate(now));
  // 索引 (tenant_id, week_start) で引く。今回の cron で積む前の値を使う。
  const firstWeeks = new Map(
    (
      await db
        .select({
          tenantId: mentorMemos.tenantId,
          week: sql<string>`min(${mentorMemos.weekStart})`,
        })
        .from(mentorMemos)
        .groupBy(mentorMemos.tenantId)
    ).map((r) => [r.tenantId, r.week]),
  );
  let total = 0;
  for (let i = 0; i < MEMO_BACKFILL_WEEKS; i++) {
    const weekStart = addStudyDays(latest, -7 * i);
    const eligible =
      i === 0
        ? null
        : new Set(
            [...firstWeeks].flatMap(([tenantId, first]) => (first < weekStart ? [tenantId] : [])),
          );
    // 古い週ほど条件を満たすテナントは減るので、無くなったらそこで止める。
    if (eligible && eligible.size === 0) break;
    total += await enqueueWeek(db, weekStart, eligible, now);
  }
  return total;
}

/**
 * 担当のいる受講者ごとに、1 つの週のメモを積む。担当は同じテナントの有効な講師だけ。
 * その週の終わりまでに受講を始めていた受講者だけを積む (受講中の登録か、その週以降に修了した登録がある)。
 * 既に積んだ受講者は先に除くので、15分ごとに同じ書き込みを繰り返さない。`tenants` を渡すと、
 * そのテナントの受講者だけを積む (null はすべて)。
 */
async function enqueueWeek(
  db: Db,
  weekStart: string,
  tenants: ReadonlySet<string> | null,
  now: Date,
): Promise<number> {
  const weekBegin = new Date(studyDateStartMs(weekStart));
  const weekEnd = new Date(studyDateStartMs(addStudyDays(weekStart, 7)));
  const instructor = alias(profiles, "instructor");
  const learners = await db
    .select({ id: profiles.id, tenantId: profiles.tenantId })
    .from(learnerInstructors)
    .innerJoin(profiles, eq(profiles.id, learnerInstructors.learnerId))
    .innerJoin(
      instructor,
      and(
        eq(instructor.id, learnerInstructors.instructorId),
        eq(instructor.tenantId, profiles.tenantId),
        eq(instructor.role, "instructor"),
        eq(instructor.disabled, false),
      ),
    )
    .where(
      and(
        eq(profiles.disabled, false),
        notExists(
          db
            .select({ one: sql`1` })
            .from(mentorMemos)
            .where(
              and(eq(mentorMemos.learnerId, profiles.id), eq(mentorMemos.weekStart, weekStart)),
            ),
        ),
        exists(
          db
            .select({ one: sql`1` })
            .from(enrollments)
            .where(
              and(
                eq(enrollments.userId, profiles.id),
                eq(enrollments.tenantId, profiles.tenantId),
                lt(enrollments.enrolledAt, weekEnd),
                // 週の途中で修了した受講者も、その週の材料があるので積む (修了すると active でなくなる)。
                // 修了の時刻が無い登録 (登録の編集で状態だけ変えたもの) は、その週に学習の記録が
                // あれば積む (時刻で判断できないので、週の材料があるかで決める)。
                or(
                  eq(enrollments.status, "active"),
                  and(eq(enrollments.status, "completed"), gte(enrollments.completedAt, weekBegin)),
                  and(
                    eq(enrollments.status, "completed"),
                    isNull(enrollments.completedAt),
                    exists(
                      db
                        .select({ one: sql`1` })
                        .from(studyActivity)
                        .where(
                          and(
                            eq(studyActivity.userId, profiles.id),
                            eq(studyActivity.tenantId, profiles.tenantId),
                            gte(studyActivity.date, weekStart),
                            lte(studyActivity.date, addStudyDays(weekStart, 6)),
                          ),
                        ),
                    ),
                  ),
                ),
              ),
            ),
        ),
      ),
    )
    .orderBy(asc(profiles.id));
  const targets = tenants ? learners.filter((l) => tenants.has(l.tenantId)) : learners;
  if (targets.length === 0) return 0;
  const values = targets.map((l) => ({
    id: crypto.randomUUID(),
    tenantId: l.tenantId,
    learnerId: l.id,
    weekStart,
    nextAttemptAt: now,
    createdAt: now,
  }));
  const [first] = values;
  if (!first) return 0;
  const size = rowsPerInsert((n) =>
    db
      .insert(mentorMemos)
      .values(Array.from({ length: n }, () => first))
      .onConflictDoNothing(),
  );
  for (const part of chunk(values, size))
    await db.insert(mentorMemos).values(part).onConflictDoNothing();
  return values.length;
}

interface LeasedMemo {
  id: string;
  tenantId: string;
  learnerId: string;
  weekStart: string;
  attempts: number;
  leaseId: string;
}

/** 書けるメモを 1 件リースする。無ければ null。「選ぶ → 取る」を 1 文で行う。 */
export async function leaseMentorMemo(
  db: Db,
  opts: { now: number; leaseMs: number },
): Promise<LeasedMemo | null> {
  const now = new Date(opts.now);
  const leaseId = crypto.randomUUID();
  const available = and(
    eq(mentorMemos.state, "queued"),
    or(isNull(mentorMemos.leaseUntil), lt(mentorMemos.leaseUntil, now)),
  );
  const next = db
    .select({ id: mentorMemos.id })
    .from(mentorMemos)
    .where(and(available, lte(mentorMemos.nextAttemptAt, now)))
    .orderBy(mentorMemos.nextAttemptAt, mentorMemos.createdAt)
    .limit(1);
  const [leased] = await db
    .update(mentorMemos)
    .set({
      leaseId,
      leaseUntil: new Date(opts.now + opts.leaseMs),
      attempts: sql`${mentorMemos.attempts} + 1`,
    })
    .where(and(sql`${mentorMemos.id} = (${next})`, available))
    .returning({
      id: mentorMemos.id,
      tenantId: mentorMemos.tenantId,
      learnerId: mentorMemos.learnerId,
      weekStart: mentorMemos.weekStart,
      attempts: mentorMemos.attempts,
    });
  return leased ? { ...leased, leaseId } : null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const LEVEL_RANK: Record<EvidenceLevel, number> = { supported: 0, independent: 1, retained: 2 };
const SERVER_SUPPORT_KINDS: readonly string[] = RECORDED_SUPPORT_KINDS;
const DECLARED_SUPPORT_KINDS: readonly string[] = SUPPORT_KINDS;

/**
 * 1 人・1 週間の材料を集める。どの読み出しも受講者とテナントで絞る。
 * 学習ペースは生成した日のもの (`loadLearningPace` は過去の時点を再現しない)。
 */
export async function collectMemoMaterial(
  db: Db,
  learner: Caller,
  weekStart: string,
  now = new Date(),
): Promise<MentorMemoMaterial> {
  const tenant = learner.tenantId;
  const weekEnd = addStudyDays(weekStart, 6);
  const from = new Date(studyDateStartMs(weekStart));
  const to = new Date(studyDateStartMs(addStudyDays(weekStart, 7)));
  const pace = await loadLearningPace(db, learner, toStudyDate(now)).catch((e: unknown) => {
    console.error("[mentor-memo] learning pace failed", { learnerId: learner.id }, e);
    return null;
  });
  const [days, sinceWeek, passed, evidence, stumbles, streaks, recorded, aiResults, humanReviews] =
    await Promise.all([
      db
        .select({
          date: studyActivity.date,
          watchedSec: studyActivity.watchedSec,
          completed: studyActivity.completedLessons,
        })
        .from(studyActivity)
        .where(
          and(
            eq(studyActivity.userId, learner.id),
            eq(studyActivity.tenantId, tenant),
            gte(studyActivity.date, weekStart),
            lte(studyActivity.date, weekEnd),
          ),
        ),
      // 週の始まりから生成の時点までの提出。支援の記録は提出に添えて届くので、週末に使った支援が
      // 翌週の提出に載ることがある。提出の数は提出の日時で、支援は支援の時刻で週に配る。
      db
        .select({
          at: submissions.submittedAt,
          mode: submissions.submissionMode,
          supportLog: submissions.supportLog,
        })
        .from(submissions)
        .where(
          and(
            eq(submissions.tenantId, tenant),
            eq(submissions.studentId, learner.id),
            gte(submissions.submittedAt, from),
          ),
        ),
      // 課題の表はテナントを持たないので、単元 → ステージで絞る。
      db
        .select({ title: tasks.title, kind: tasks.kind })
        .from(taskProgress)
        .innerJoin(tasks, eq(tasks.id, taskProgress.taskId))
        .innerJoin(sections, eq(sections.id, tasks.sectionId))
        .innerJoin(stages, eq(stages.id, sections.stageId))
        .where(
          and(
            eq(taskProgress.userId, learner.id),
            eq(stages.tenantId, tenant),
            gte(taskProgress.passedAt, from),
            lt(taskProgress.passedAt, to),
          ),
        )
        .orderBy(asc(taskProgress.passedAt)),
      db
        .select({
          skillId: skillEvidence.skillId,
          title: skills.title,
          level: skillEvidence.level,
          at: skillEvidence.createdAt,
        })
        .from(skillEvidence)
        .innerJoin(skills, eq(skills.id, skillEvidence.skillId))
        .where(
          and(
            eq(skillEvidence.userId, learner.id),
            eq(skillEvidence.tenantId, tenant),
            lt(skillEvidence.createdAt, to),
          ),
        ),
      // つまずきの通知 ID は作る側と同じ接頭辞 (`stumbleIdPrefix`) で始まるので、主キーの範囲で引く。
      db
        .select({
          id: notifications.id,
          signal: sql<string | null>`json_extract(${notifications.payload}, '$.signal')`,
        })
        .from(notifications)
        .where(
          and(
            or(...STUMBLE_SIGNALS.map((signal) => stumbleIdRange(signal, learner.id))),
            eq(notifications.tenantId, tenant),
            eq(notifications.type, "learner_stumble"),
            sql`json_extract(${notifications.payload}, '$.learner_id') = ${learner.id}`,
            gte(notifications.createdAt, from),
            lt(notifications.createdAt, to),
          ),
        ),
      db
        .select({ title: tasks.title, streak: taskLocalRuns.failureStreak })
        .from(taskLocalRuns)
        .innerJoin(tasks, eq(tasks.id, taskLocalRuns.taskId))
        .where(
          and(
            eq(taskLocalRuns.userId, learner.id),
            eq(taskLocalRuns.tenantId, tenant),
            gte(taskLocalRuns.failureStreak, STREAK_MIN),
          ),
        )
        .orderBy(desc(taskLocalRuns.failureStreak))
        .limit(5),
      db
        .select({ kind: taskSupportEvents.kind })
        .from(taskSupportEvents)
        .where(
          and(
            eq(taskSupportEvents.userId, learner.id),
            eq(taskSupportEvents.tenantId, tenant),
            gte(taskSupportEvents.createdAt, from),
            lt(taskSupportEvents.createdAt, to),
          ),
        ),
      // その週に提出へ当てた AI の結果 (受講者に見せたかどうかによらず、講師向けの集計に使う)。
      db
        .select({
          submissionId: aiReviews.submissionId,
          outcome: aiReviews.outcome,
          reasons: aiReviews.routeReasons,
          results: aiReviews.rubricResults,
        })
        .from(aiReviews)
        .innerJoin(submissions, eq(submissions.id, aiReviews.submissionId))
        .where(
          and(
            eq(submissions.tenantId, tenant),
            eq(submissions.studentId, learner.id),
            eq(aiReviews.disposition, "applied"),
            gte(aiReviews.appliedAt, from),
            lt(aiReviews.appliedAt, to),
          ),
        ),
      db
        .select({ verdict: submissionReviews.verdict })
        .from(submissionReviews)
        .innerJoin(submissions, eq(submissions.id, submissionReviews.submissionId))
        .where(
          and(
            eq(submissions.tenantId, tenant),
            eq(submissions.studentId, learner.id),
            eq(submissionReviews.source, "human"),
            gte(submissionReviews.createdAt, from),
            lt(submissionReviews.createdAt, to),
          ),
        ),
    ]);

  const submitted = sinceWeek.filter((s) => s.at < to);
  const activeDates = new Set(
    days.filter((d) => d.watchedSec > 0 || d.completed > 0).map((d) => d.date),
  );
  for (const s of submitted) activeDates.add(toStudyDate(s.at));

  // スキルごとに最も高い水準。週の初めと終わりを比べて、上がったスキルを拾う。
  const best = (before: Date) => {
    const map = new Map<string, { title: string; level: EvidenceLevel }>();
    for (const e of evidence) {
      if (e.at >= before) continue;
      const level = e.level as EvidenceLevel;
      const current = map.get(e.skillId);
      if (!current || LEVEL_RANK[level] > LEVEL_RANK[current.level])
        map.set(e.skillId, { title: e.title, level });
    }
    return map;
  };
  const atEnd = best(to);
  const atStart = best(from);
  const counts: Record<EvidenceLevel, number> = { supported: 0, independent: 0, retained: 0 };
  const changed: { skill: string; level: EvidenceLevel }[] = [];
  for (const [skillId, latest] of atEnd) {
    counts[latest.level]++;
    const before = atStart.get(skillId);
    if (!before || LEVEL_RANK[latest.level] > LEVEL_RANK[before.level])
      changed.push({ skill: latest.title, level: latest.level });
  }

  const stumbleCounts: Partial<Record<StumbleSignal, number>> = {};
  for (const n of stumbles)
    if (n.signal && (STUMBLE_SIGNALS as readonly string[]).includes(n.signal)) {
      const signal = n.signal as StumbleSignal;
      stumbleCounts[signal] = (stumbleCounts[signal] ?? 0) + 1;
    }

  // 支援の量。講師への相談は相談の提出の日時、提出に添えた支援は支援そのものの時刻で週に配る。
  // 添えた支援は試行ごとに繰り返し載るので、種類と時刻で 1 件にまとめる (`loadTaskSupport` と同じ)。
  // 人のレビューは `reviews` で数える。
  const support: Partial<Record<SupportRecordKind, number>> = {};
  const add = (kind: SupportRecordKind) => {
    support[kind] = (support[kind] ?? 0) + 1;
  };
  for (const e of recorded)
    if (SERVER_SUPPORT_KINDS.includes(e.kind)) add(e.kind as SupportRecordKind);
  const seen = new Set<string>();
  for (const s of submitted) if (s.mode === "consult") add("consult");
  for (const s of sinceWeek) {
    for (const e of s.supportLog ?? []) {
      if (!DECLARED_SUPPORT_KINDS.includes(e.kind)) continue;
      if (s.mode === "consult" && e.kind === "instructor" && e.detail === CONSULT_SUPPORT_DETAIL)
        continue;
      const at = new Date(e.at);
      if (Number.isNaN(at.getTime()) || at < from || at >= to) continue;
      const key = `${e.kind}|${at.toISOString()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      add(e.kind as SupportRecordKind);
    }
  }

  // 1 つの提出に 2 度当てた結果は無いが、念のため提出ごとに 1 件で数える。
  const bySubmission = new Map(aiResults.map((r) => [r.submissionId, r]));
  const escalationReasons: Partial<Record<RouteReason, number>> = {};
  const unmet = new Map<string, number>();
  let aiConfirmed = 0;
  let aiEscalated = 0;
  for (const r of bySubmission.values()) {
    if (r.outcome === "confirmed") {
      aiConfirmed++;
      continue;
    }
    aiEscalated++;
    for (const reason of r.reasons)
      escalationReasons[reason] = (escalationReasons[reason] ?? 0) + 1;
    for (const item of r.results)
      if (item.required && item.result !== "met") {
        const criterion = item.criterion.slice(0, 120);
        unmet.set(criterion, (unmet.get(criterion) ?? 0) + 1);
      }
  }

  return {
    week: { start: weekStart, end: weekEnd },
    pace: pace
      ? {
          weeklyHours: pace.settings.weeklyHours,
          completedHours: round1(pace.completedMinutes / 60),
          expectedHours: round1(pace.expectedMinutes / 60),
          differenceHours: round1(pace.differenceMinutes / 60),
          delayDays: pace.delayDays,
          needsInstructor: pace.needsInstructor,
          started: pace.settings.startDate !== null && pace.settings.startDate <= pace.today,
        }
      : null,
    activity: {
      activeDays: activeDates.size,
      studyMinutes: Math.round(days.reduce((a, d) => a + d.watchedSec, 0) / 60),
      completedLessons: days.reduce((a, d) => a + d.completed, 0),
      submissions: submitted.length,
    },
    passedTasks: passed.slice(0, 10),
    passedTaskCount: passed.length,
    skills: { counts, changed: changed.slice(0, 10) },
    stumbles: stumbleCounts,
    failureStreaks: streaks,
    support,
    reviews: {
      aiConfirmed,
      aiEscalated,
      escalationReasons,
      unmetCriteria: [...unmet]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([criterion, count]) => ({ criterion, count })),
      humanPass: humanReviews.filter((r) => r.verdict === "pass").length,
      humanResubmit: humanReviews.filter((r) => r.verdict !== "pass").length,
    },
  };
}

export type MemoFailure = "unavailable" | "refusal" | "timeout" | "invalid-format" | "error";

export type MemoWriteResult =
  | {
      ok: true;
      output: MentorMemoOutput;
      model: string;
      usage: Record<string, number | null>;
    }
  | { ok: false; failure: MemoFailure; retryable: boolean; detail: string; model: string | null };

/** AI に 1 回書かせる。失敗は理由と、次の cron でやり直す価値があるかに分ける。 */
export async function writeMemoWithAi(
  env: Env,
  material: MentorMemoMaterial,
  timeoutMs: number,
): Promise<MemoWriteResult> {
  if (!env.ANTHROPIC_API_KEY)
    return {
      ok: false,
      failure: "unavailable",
      retryable: false,
      detail: "ANTHROPIC_API_KEY が未設定です",
      model: null,
    };
  const model = resolveAnthropicModel(env, env.MENTOR_MEMO_MODEL);
  const prompt = buildMentorMemoPrompt(material);
  try {
    const completion = await completeJsonSchema({
      env,
      model,
      system: prompt.system,
      messages: prompt.messages,
      schema: MENTOR_MEMO_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: MAX_OUTPUT_TOKENS,
      timeoutMs,
    });
    if (completion.stopReason === "refusal")
      return {
        ok: false,
        failure: "refusal",
        retryable: false,
        detail: "refusal",
        model: completion.model,
      };
    const output =
      completion.stopReason === "max_tokens" ? null : parseMentorMemoOutput(completion.text);
    if (!output)
      return {
        ok: false,
        failure: "invalid-format",
        retryable: false,
        detail: `stop_reason=${completion.stopReason ?? "null"}`,
        model: completion.model,
      };
    return { ok: true, output, model: completion.model, usage: completion.usage };
  } catch (e) {
    if (e instanceof MissingApiKeyError || e instanceof MissingGatewayConfigError)
      return {
        ok: false,
        failure: "unavailable",
        retryable: false,
        detail: e.message,
        model: null,
      };
    if (
      e instanceof Anthropic.APIConnectionTimeoutError ||
      e instanceof Anthropic.APIUserAbortError ||
      (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError"))
    )
      return { ok: false, failure: "timeout", retryable: true, detail: "timeout", model };
    if (e instanceof Anthropic.APIConnectionError)
      return { ok: false, failure: "error", retryable: true, detail: e.message, model };
    if (e instanceof Anthropic.APIError) {
      const status = e.status ?? 0;
      return {
        ok: false,
        failure: "error",
        retryable: status === 429 || status >= 500,
        detail: `${status} ${e.message}`.slice(0, 500),
        model,
      };
    }
    return {
      ok: false,
      failure: "error",
      retryable: false,
      detail: e instanceof Error ? e.message.slice(0, 500) : "unknown",
      model,
    };
  }
}

/** リースを返して、次の cron でやり直す。 */
async function releaseMemo(db: Db, memo: LeasedMemo, now: number, error: string) {
  await db
    .update(mentorMemos)
    .set({
      leaseId: null,
      leaseUntil: null,
      nextAttemptAt: new Date(now + RETRY_DELAY_MS),
      lastError: error.slice(0, 500),
    })
    .where(
      and(
        eq(mentorMemos.id, memo.id),
        eq(mentorMemos.leaseId, memo.leaseId),
        eq(mentorMemos.state, "queued"),
      ),
    );
}

/**
 * 試行の上限に達したメモを「作れなかった」で終える。機械的な要約も材料が要るので書けない。
 * 終えたメモはもうリースしないので、待ち行列に残り続けない。
 */
async function failMemo(db: Db, memo: LeasedMemo, error: string) {
  await db
    .update(mentorMemos)
    .set({ state: "failed", leaseId: null, leaseUntil: null, lastError: error.slice(0, 500) })
    .where(
      and(
        eq(mentorMemos.id, memo.id),
        eq(mentorMemos.leaseId, memo.leaseId),
        eq(mentorMemos.state, "queued"),
      ),
    );
}

export type MemoOutcome = "ai" | "fallback" | "retry" | "failed" | "skipped";

/** リースした 1 件を書く。 */
export async function processLeasedMemo(
  env: Env,
  db: Db,
  memo: LeasedMemo,
  opts: { timeoutMs: number; now?: () => number },
): Promise<MemoOutcome> {
  const now = opts.now ?? Date.now;
  const held = and(
    eq(mentorMemos.id, memo.id),
    eq(mentorMemos.leaseId, memo.leaseId),
    eq(mentorMemos.state, "queued"),
  );
  // 上限を超えた試行は、前の試行がリースを持ったまま止まった (返しも終えもしなかった) ときだけ
  // 起きる。同じところで止まり続けないよう、材料を集め直さずに終える。
  if (memo.attempts > MAX_MEMO_ATTEMPTS) {
    await failMemo(db, memo, "処理の途中で止まった試行が上限を超えました");
    return "failed";
  }
  const [learner] = await db
    .select({
      id: profiles.id,
      tenantId: profiles.tenantId,
      role: profiles.role,
      name: profiles.displayName,
      email: profiles.email,
      disabled: profiles.disabled,
    })
    .from(profiles)
    .where(and(eq(profiles.id, memo.learnerId), eq(profiles.tenantId, memo.tenantId)))
    .limit(1);
  // 積んだあとに無効になった受講者のメモは書かない (読む人もいない)。
  if (!learner || learner.disabled) {
    await db.delete(mentorMemos).where(held);
    return "skipped";
  }
  const material = await collectMemoMaterial(
    db,
    learner as Caller,
    memo.weekStart,
    new Date(now()),
  );
  const result = await writeMemoWithAi(env, material, opts.timeoutMs);
  if (!result.ok && result.retryable && memo.attempts < MAX_MEMO_ATTEMPTS) {
    await releaseMemo(db, memo, now(), `${result.failure}: ${result.detail}`);
    return "retry";
  }
  const output = result.ok ? result.output : buildFallbackMemo(material);
  await db
    .update(mentorMemos)
    .set({
      state: "ready",
      source: result.ok ? "ai" : "fallback",
      summary: output.summary,
      observations: output.observations,
      suggestedAction: output.suggestedAction,
      actionReason: output.actionReason,
      messageDraft: output.messageDraft,
      material,
      failure: result.ok ? null : result.failure,
      model: result.model,
      promptVersion: MENTOR_MEMO_PROMPT_VERSION,
      usage: result.ok ? result.usage : null,
      generatedAt: new Date(now()),
      leaseId: null,
      leaseUntil: null,
      lastError: result.ok ? null : `${result.failure}: ${result.detail}`.slice(0, 500),
    })
    .where(held);
  return result.ok ? "ai" : "fallback";
}

/** 待ち行列を `maxJobs` 件まで順に処理する。残りは次の cron が拾う。 */
export async function processMentorMemoQueue(
  env: Env,
  db: Db,
  opts: { maxJobs: number; timeoutMs: number; now?: () => number },
): Promise<MemoOutcome[]> {
  const now = opts.now ?? Date.now;
  const outcomes: MemoOutcome[] = [];
  for (let i = 0; i < opts.maxJobs; i++) {
    const memo = await leaseMentorMemo(db, {
      now: now(),
      // リースは処理の上限 (AI の待ち時間 + 材料集め) より長くする。
      leaseMs: opts.timeoutMs + 60_000,
    });
    if (!memo) break;
    try {
      outcomes.push(await processLeasedMemo(env, db, memo, { timeoutMs: opts.timeoutMs, now }));
    } catch (e) {
      // 材料集めの失敗など。上限まではリースを返して次の cron でやり直し (回数はリースで数える)、
      // 上限に達したら「作れなかった」で終える (AI の失敗と違い、機械的な要約も書けない)。
      console.error("[mentor-memo] memo failed", memo.id, e);
      const error = e instanceof Error ? e.message : "unknown";
      const last = memo.attempts >= MAX_MEMO_ATTEMPTS;
      await (last ? failMemo(db, memo, error) : releaseMemo(db, memo, now(), error)).catch(() => {
        // 書き戻せなくてもリースの期限で開き、次の試行が上限を超えて終える。
      });
      outcomes.push(last ? "failed" : "retry");
    }
  }
  return outcomes;
}

/** 15分の cron から呼ぶ。前の週のメモを積み、数件ずつ書く。 */
export async function runMentorMemoCron(env: Env, db: Db, now: () => number = Date.now) {
  await enqueueWeeklyMemos(db, new Date(now()));
  return processMentorMemoQueue(env, db, {
    maxJobs: MEMOS_PER_RUN,
    timeoutMs: MEMO_AI_TIMEOUT_MS,
    now,
  });
}

type MemoRow = typeof mentorMemos.$inferSelect;

/** 講師の画面に返す形。リースや使用量など運用の列は返さない。 */
export function mentorMemoView(row: MemoRow, learnerName: string): MentorMemoView {
  return {
    id: row.id,
    learnerId: row.learnerId,
    learnerName,
    weekStart: row.weekStart,
    weekEnd: addStudyDays(row.weekStart, 6),
    state: row.state,
    source: row.source,
    summary: row.summary,
    observations: row.observations,
    suggestedAction: row.suggestedAction,
    actionReason: row.actionReason,
    messageDraft: row.messageDraft,
    material: row.material ?? null,
    model: row.model,
    promptVersion: row.promptVersion,
    generatedAt: row.generatedAt?.toISOString() ?? null,
    actions: row.actions,
    handledAt: row.handledAt?.toISOString() ?? null,
  };
}

export function isMemoAction(value: unknown): value is MemoAction {
  return typeof value === "string" && (MEMO_ACTIONS as readonly string[]).includes(value);
}
