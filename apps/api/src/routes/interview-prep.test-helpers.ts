/**
 * Issue #205 / #206 — interview prep test contracts and in-memory DB mock.
 * Expected production modules: routes/interview-prep.ts, routes/skill-sheet.ts,
 * lib/interview-answer-template.ts, lib/interview-answer-template-cron.ts
 */

import { SignJWT } from "jose";

import type { ProfileRole } from "../lib/authz.js";
import type { Env } from "../env.js";

export const INTERVIEW_PREP_ASSIGNMENTS_PATH = "/api/interview-prep/assignments";
export const INTERVIEW_PREP_QUESTIONS_PATH = "/api/interview-prep/questions";
export const INTERVIEW_PREP_PROGRESS_PATH = "/api/interview-prep/progress";
export const INTERVIEW_PREP_MY_ANSWERS_PATH = "/api/interview-prep/my-answers";
export const SKILL_SHEET_SAVE_PATH = "/api/skill-sheets";

export const interviewPrepAssignmentPath = (profileId: string) =>
  `${INTERVIEW_PREP_ASSIGNMENTS_PATH}/${encodeURIComponent(profileId)}`;

export const interviewPrepAnswerTemplatePath = (profileId: string, questionNo: number) =>
  `/api/interview-prep/answer-templates/${encodeURIComponent(profileId)}/${questionNo}`;

export const interviewPrepAdoptDraftPath = (profileId: string, questionNo: number) =>
  `${interviewPrepAnswerTemplatePath(profileId, questionNo)}/adopt-draft`;

export const interviewPrepProgressPath = (questionNo: number) =>
  `${INTERVIEW_PREP_PROGRESS_PATH}/${questionNo}`;

export const INTERVIEW_PREP_FIX_NOTES_PATH = "/api/interview-prep/fix-notes";

export const INTERVIEW_PREP_PRACTICE_SET_PATH = "/api/interview-prep/practice-set";

export const interviewPrepPracticeSetPath = (id: string) =>
  `${INTERVIEW_PREP_PRACTICE_SET_PATH}/${encodeURIComponent(id)}`;

export const interviewPrepFixNotePath = (questionNoOrId: number | string) =>
  `${INTERVIEW_PREP_FIX_NOTES_PATH}/${questionNoOrId}`;

export const TEST_JWT_SECRET = "interview-prep-test-secret";

export const SEED_PROFILES = {
  learner: { id: "seed-learner", tenantId: "ses", role: "student" as ProfileRole },
  learnerB: { id: "seed-learner-b", tenantId: "ses", role: "student" as ProfileRole },
  learnerC: { id: "seed-learner-c", tenantId: "ses", role: "student" as ProfileRole },
  learnerD: { id: "seed-learner-d", tenantId: "ses", role: "student" as ProfileRole },
  instructor: { id: "seed-instructor", tenantId: "ses", role: "instructor" as ProfileRole },
  admin: { id: "seed-admin", tenantId: "ses", role: "admin" as ProfileRole },
  sales: { id: "seed-sales", tenantId: "ses", role: "sales" as ProfileRole },
  platformAdmin: {
    id: "seed-platform-admin",
    tenantId: "ses",
    role: "platform_admin" as ProfileRole,
  },
} as const;

export interface StudentProfile {
  id: string;
  tenantId: string;
  role: ProfileRole;
  displayName: string;
  email: string | null;
}

export interface InterviewPrepAssignmentRow {
  tenantId: string;
  profileId: string;
  categories: string[];
  interviewDate: string | null;
  interviewNote: string | null;
  assignedBy: string | null;
}

export interface SkillSheetRow {
  id: string;
  tenantId: string;
  profileId: string;
  sheet: Record<string, unknown>;
  updatedBy: string;
}

export interface PersonalAnswerTemplateRow {
  id: string;
  tenantId: string;
  profileId: string;
  questionNo: number;
  content: string | null;
  draftContent: string | null;
  generatedFrom: string | null;
  source: "ai" | "manual";
  updatedBy: string | null;
}

export interface GenerationJobRow {
  id: string;
  tenantId: string;
  profileId: string;
  batchId: string;
  status: "pending" | "done" | "failed";
  requested: number;
  succeeded: number;
  createdAt: Date;
}

/** Issue #234 — 改善点メモ (interview_fix_notes)。 */
export interface FixNoteRow {
  id: string;
  tenantId: string;
  profileId: string;
  questionNo: number;
  text: string;
  createdAt: Date;
  resolvedAt: Date | null;
}

/** Issue #235 — 質問ごとの学習ステータス (interview_progress。 SM-2 列を含む)。 */
export interface ProgressRow {
  tenantId: string;
  profileId: string;
  questionNo: number;
  status: "read" | "confident";
  practicedCount: number;
  lastPracticedAt: Date | null;
  srsEase: number;
  srsIntervalDays: number;
  srsReps: number;
  srsDueDate: string | null;
  lastResult: "again" | "good" | null;
}

/** Issue #235 — 今日の練習セット (interview_practice_sets)。 */
export interface PracticeSetRow {
  id: string;
  tenantId: string;
  profileId: string;
  date: string;
  questionNos: number[];
  completedNos: number[];
  confidentNos: number[];
  startedPercent: number;
  status: "active" | "done";
  /** 楽観ロックの版数 (消化記録の競合検出)。 */
  version: number;
  createdAt: Date;
}

export interface InterviewPrepTestState {
  assignments: Map<string, InterviewPrepAssignmentRow>;
  notifications: Array<Record<string, unknown>>;
  skillSheets: Map<string, SkillSheetRow>;
  personalTemplates: Map<string, PersonalAnswerTemplateRow>;
  generationJobs: GenerationJobRow[];
  fixNotes: FixNoteRow[];
  progress: ProgressRow[];
  practiceSets: PracticeSetRow[];
  /** 質問バンクの差し替え (セット選定のテストで 10 問以上を用意する)。 */
  questions?: typeof TEST_INTERVIEW_QUESTIONS;
  /**
   * Issue #237 — 手動編集の印 (質問番号 → 誰がいつ)。 質問バンク本体とは別に
   * 持つことで、 バンクを差し替えるテストでも編集の有無だけを組み立てられる。
   */
  questionEdits: Map<
    number,
    { editedAt: Date; editedBy: string; releaseRequestedAt?: Date | null }
  >;
  /** テーブルごとの SELECT 回数。 モニタリング集計の N+1 検出に使う (Issue #236)。 */
  selectCounts: Record<string, number>;
  /**
   * 質問を更新した直後に呼ばれるテスト用フック (Issue #237)。 「保存の途中で別の
   * staff が同じ質問を書き換えた」状況を作るために使う。
   */
  afterQuestionUpdate?: () => void;
  /** 排他ロック (resource_locks)。 id → holder。 */
  locks: Map<string, string>;
  /**
   * ロックを「他が保持中」にし続けるテスト用フック (Issue #237)。
   * 取得を諦めたときの振る舞いを試す。
   */
  lockBusy?: boolean;
}

/** Fixture bank for #206 — assigned PHP A/B, JS A, and common A. */
export const TEST_INTERVIEW_QUESTIONS = [
  {
    no: 101,
    categories: ["PHP"],
    subcategory: "",
    freq: "A" as const,
    question: "PHP A 必修?",
    time: "30秒",
    keywords: "",
    intent: "基礎",
    answer_template: '共通A: <span class="blank">経験年数</span>年です',
    ng: "",
    criteria: "",
    is_reverse: 0,
  },
  {
    no: 102,
    categories: ["PHP"],
    subcategory: "",
    freq: "B" as const,
    question: "PHP B 推奨?",
    time: "30秒",
    keywords: "",
    intent: "応用",
    answer_template: '共通B: <span class="blank">具体例</span>があります',
    ng: "",
    criteria: "",
    is_reverse: 0,
  },
  {
    no: 103,
    categories: ["JS"],
    subcategory: "",
    freq: "A" as const,
    question: "JS A 必修?",
    time: "30秒",
    keywords: "",
    intent: "基礎",
    answer_template: "共通JS A テンプレ",
    ng: "",
    criteria: "",
    is_reverse: 0,
  },
  {
    no: 104,
    categories: ["全案件共通"],
    subcategory: "",
    freq: "A" as const,
    question: "共通 A?",
    time: "30秒",
    keywords: "",
    intent: "共通",
    answer_template: '共通: <span class="blank">自己紹介</span>です',
    ng: "",
    criteria: "",
    is_reverse: 0,
  },
];

export const TEST_STUDENTS: StudentProfile[] = [
  {
    id: SEED_PROFILES.learner.id,
    tenantId: "ses",
    role: "student",
    displayName: "Learner A",
    email: "learner-a@example.local",
  },
  {
    id: SEED_PROFILES.learnerB.id,
    tenantId: "ses",
    role: "student",
    displayName: "Learner B",
    email: "learner-b@example.local",
  },
  {
    id: SEED_PROFILES.learnerC.id,
    tenantId: "ses",
    role: "student",
    displayName: "Learner C",
    email: "learner-c@example.local",
  },
  {
    id: SEED_PROFILES.learnerD.id,
    tenantId: "ses",
    role: "student",
    displayName: "Learner D",
    email: "learner-d@example.local",
  },
];

/**
 * 受講者以外のプロフィール。 面談対策は管理者も受講者と同じ内容を練習するので、
 * 対象者一覧 (`GET /assignments`) に載る管理者と、 載らない講師・営業の両方を置く。
 */
export const TEST_STAFF: StudentProfile[] = [
  {
    id: SEED_PROFILES.admin.id,
    tenantId: "ses",
    role: "admin",
    displayName: "Admin A",
    email: "admin-a@example.local",
  },
  {
    id: SEED_PROFILES.instructor.id,
    tenantId: "ses",
    role: "instructor",
    displayName: "Instructor A",
    email: "instructor-a@example.local",
  },
  {
    id: SEED_PROFILES.sales.id,
    tenantId: "ses",
    role: "sales",
    displayName: "Sales A",
    email: "sales-a@example.local",
  },
];

export const TEST_PROFILES: StudentProfile[] = [...TEST_STUDENTS, ...TEST_STAFF];

/** 面談対策の対象になれるロール (本番の `INTERVIEW_PREP_PRACTICE_ROLES` と揃える)。 */
const PREP_TARGET_ROLES: ProfileRole[] = ["student", "admin", "platform_admin"];

const DRIZZLE_NAME = Symbol.for("drizzle:Name");

function tableName(table: object): string {
  return (table as Record<symbol, string>)[DRIZZLE_NAME];
}

function assignmentKey(tenantId: string, profileId: string): string {
  return `${tenantId}:${profileId}`;
}

function selectShapeKeys(shape: Record<string, unknown>): string[] {
  return Object.keys(shape);
}

function mergeNullableField<T>(
  set: Record<string, unknown>,
  row: Record<string, unknown>,
  existing: T | undefined,
  key: string,
): T | null | undefined {
  if (key in set) return set[key] as T | null;
  if (key in row) return row[key] as T | null;
  return existing;
}

function personalTemplateKey(tenantId: string, profileId: string, questionNo: number): string {
  return `${tenantId}:${profileId}:${questionNo}`;
}

function skillSheetKey(tenantId: string, profileId: string): string {
  return `${tenantId}:${profileId}`;
}

export function createInterviewPrepTestState(): InterviewPrepTestState {
  return {
    assignments: new Map(),
    notifications: [],
    skillSheets: new Map(),
    personalTemplates: new Map(),
    generationJobs: [],
    fixNotes: [],
    progress: [],
    practiceSets: [],
    questionEdits: new Map(),
    locks: new Map(),
    selectCounts: {},
  };
}

/** セット選定のテスト用に A 必修を任意の数だけ生やす (割当は PHP)。 */
export function practiceQuestionBank(
  count: number,
  startNo = 201,
): typeof TEST_INTERVIEW_QUESTIONS {
  return Array.from({ length: count }, (_, i) => ({
    no: startNo + i,
    categories: ["PHP"],
    subcategory: "",
    freq: "A" as const,
    question: `PHP A 必修 ${startNo + i}?`,
    time: "30秒",
    keywords: "",
    intent: "基礎",
    answer_template: "共通テンプレ",
    ng: "",
    criteria: "",
    is_reverse: 0,
  }));
}

export function progressRow(over: Partial<ProgressRow> & { questionNo: number }): ProgressRow {
  return {
    tenantId: "ses",
    profileId: SEED_PROFILES.learner.id,
    status: "read",
    practicedCount: 0,
    lastPracticedAt: null,
    srsEase: 2.5,
    srsIntervalDays: 0,
    srsReps: 0,
    srsDueDate: null,
    lastResult: null,
    ...over,
  };
}

export function minimalSkillSheetPayload(): Record<string, unknown> {
  return {
    sections: {
      basic: { years_total: 5, current_role: "バックエンド" },
      skills: [{ name: "PHP", category: "lang", years: 3, level: "中", note: "" }],
      projects: [
        {
          period: "2024-2026",
          role: "メンバー",
          team_size: 4,
          phases: ["実装"],
          technologies: ["PHP", "Laravel"],
          summary: "EC 保守",
        },
      ],
      certifications: [],
      self_pr: "実務経験 5 年",
    },
  };
}

interface DbContext {
  callerId: string;
  callerTenantId: string;
  targetProfileId?: string;
  /** ルートの :no (改善点メモの追加など質問単位のクエリで where の代わりに使う)。 */
  questionNo?: number;
  /** ルートの :id (改善点メモの消し込み)。 */
  rowId?: string;
}

function resolveAssignment(
  state: InterviewPrepTestState,
  tenantId: string,
  profileId: string,
): InterviewPrepAssignmentRow | undefined {
  return state.assignments.get(assignmentKey(tenantId, profileId));
}

function assignmentPayload(row: InterviewPrepAssignmentRow, includeDateFields: boolean) {
  const base = {
    profile_id: row.profileId,
    categories: row.categories,
  };
  if (!includeDateFields) return base;
  return {
    ...base,
    interviewDate: row.interviewDate,
    note: row.interviewNote,
    interview_date: row.interviewDate,
    interview_note: row.interviewNote,
  };
}

export function createInterviewPrepTestDb(
  state: InterviewPrepTestState,
  ctx: DbContext,
): Record<string, unknown> {
  const executeSelect = async (
    fromTable: string,
    shape: Record<string, unknown>,
    limit?: number,
  ): Promise<unknown[]> => {
    const keys = selectShapeKeys(shape);
    state.selectCounts[fromTable] = (state.selectCounts[fromTable] ?? 0) + 1;

    if (fromTable === "profiles") {
      if (keys.includes("id") && keys.includes("tenantId") && keys.includes("role")) {
        const profileId = ctx.targetProfileId ?? ctx.callerId;
        const found = TEST_PROFILES.find((s) => s.id === profileId);
        if (!found) return [];
        return [{ id: found.id, tenantId: found.tenantId, role: found.role }];
      }
      if (keys.includes("profile_id") && keys.includes("display_name")) {
        // 対象者一覧。 where 句は解釈しないので、 ロールの絞り込みはここで再現する。
        const rows = TEST_PROFILES.filter(
          (s) => s.tenantId === ctx.callerTenantId && PREP_TARGET_ROLES.includes(s.role),
        ).map((s) => ({
          profile_id: s.id,
          display_name: s.displayName,
          email: s.email,
          role: s.role,
        }));
        return limit ? rows.slice(0, limit) : rows;
      }
    }

    if (fromTable === "interview_prep_assignments") {
      const subjectProfileId = ctx.targetProfileId ?? ctx.callerId;
      if (keys.includes("categories") && limit === 1) {
        const row = resolveAssignment(state, ctx.callerTenantId, subjectProfileId);
        if (!row) return [];
        const includeDate = keys.includes("interviewDate") || keys.includes("interview_date");
        return [assignmentPayload(row, includeDate || keys.includes("note"))];
      }
      if (keys.length === 1 && keys[0] === "categories") {
        const row = resolveAssignment(state, ctx.callerTenantId, subjectProfileId);
        if (!row) return [];
        return [{ categories: row.categories }];
      }
      const includeDate = keys.includes("interviewDate") || keys.includes("interview_date");
      const rows = [...state.assignments.values()]
        .filter((a) => a.tenantId === ctx.callerTenantId)
        .map((a) => assignmentPayload(a, includeDate || keys.includes("note")));
      return limit ? rows.slice(0, limit) : rows;
    }

    if (fromTable === "interview_questions") {
      const bank = state.questions ?? TEST_INTERVIEW_QUESTIONS;
      // 編集の印「だけ」を引く問い合わせ (attachEditMarks / loadEditedQuestionNos)。
      // 本文も一緒に引く loadVisibleQuestion は下の 1 件取得へ落とす。
      if (keys.includes("editedAt") && !keys.includes("question")) {
        return bank.map((q) => ({
          no: q.no,
          editedAt: state.questionEdits.get(q.no)?.editedAt ?? null,
          editedBy: state.questionEdits.get(q.no)?.editedBy ?? null,
          releaseRequestedAt: state.questionEdits.get(q.no)?.releaseRequestedAt ?? null,
        }));
      }
      // 1 件取得 (loadVisibleQuestion) はルートの :no を条件にする。 where 句は解釈しない。
      if (limit === 1 && ctx.questionNo !== undefined) {
        return bank
          .filter((q) => q.no === ctx.questionNo)
          .map((q) => ({ ...q, editedAt: state.questionEdits.get(q.no)?.editedAt ?? null }));
      }
      return bank;
    }

    if (fromTable === "interview_progress") {
      const mine = state.progress.filter((r) => r.tenantId === ctx.callerTenantId);
      // モニタリングの集計 (Issue #236) はテナント全員ぶんを 1 回で読む。 その形は
      // select に profileId が入っていることで見分ける (where 句は解釈しない)。
      if (keys.includes("profileId")) return mine.map((r) => ({ ...r }));
      const profileId = ctx.targetProfileId ?? ctx.callerId;
      return mine.filter((r) => r.profileId === profileId).map((r) => ({ ...r }));
    }

    if (fromTable === "interview_practice_sets") {
      const profileId = ctx.targetProfileId ?? ctx.callerId;
      const mine = state.practiceSets.filter(
        (r) => r.tenantId === ctx.callerTenantId && r.profileId === profileId,
      );
      // where 句は解釈しないので、 :id があればその行、 無ければ進行中のセットを新しい順に。
      const scoped = ctx.rowId
        ? mine.filter((r) => r.id === ctx.rowId)
        : mine
            .filter((r) => r.status === "active")
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const rows = scoped.map((r) => ({
        id: r.id,
        date: r.date,
        questionNos: r.questionNos,
        completedNos: r.completedNos,
        confidentNos: r.confidentNos,
        startedPercent: r.startedPercent,
        status: r.status,
        version: r.version,
      }));
      return limit ? rows.slice(0, limit) : rows;
    }

    if (fromTable === "skill_sheets") {
      const profileId = ctx.targetProfileId ?? ctx.callerId;
      const row = state.skillSheets.get(skillSheetKey(ctx.callerTenantId, profileId));
      if (!row) return [];
      return [{ id: row.id, sheet: row.sheet, profileId: row.profileId }];
    }

    if (fromTable === "interview_personal_templates") {
      const inTenant = [...state.personalTemplates.values()].filter(
        (t) => t.tenantId === ctx.callerTenantId,
      );
      // 進捗と同じく、 profileId 付きの select はテナント全員ぶんの集計用。
      if (keys.includes("profileId")) {
        return inTenant.map((t) => ({
          profileId: t.profileId,
          questionNo: t.questionNo,
          content: t.content,
        }));
      }
      const profileId = ctx.targetProfileId ?? ctx.callerId;
      const rows = inTenant.filter((t) => t.profileId === profileId);
      return rows.map((t) => ({
        id: t.id,
        questionNo: t.questionNo,
        content: t.content,
        draftContent: t.draftContent,
        generatedFrom: t.generatedFrom,
        source: t.source,
        updatedBy: t.updatedBy,
      }));
    }

    if (fromTable === "interview_fix_notes") {
      const profileId = ctx.targetProfileId ?? ctx.callerId;
      const mine = state.fixNotes.filter(
        (n) => n.tenantId === ctx.callerTenantId && n.profileId === profileId,
      );
      // where 句は解釈しないので、 ルートパラメータで絞る:
      //   :no があればその質問、 :id の 1 件取得はその行、 :id の一覧はその行と同じ質問。
      const targetOfRowId = ctx.rowId ? mine.find((n) => n.id === ctx.rowId) : undefined;
      const scoped =
        ctx.questionNo !== undefined
          ? mine.filter((n) => n.questionNo === ctx.questionNo)
          : ctx.rowId
            ? limit === 1
              ? mine.filter((n) => n.id === ctx.rowId)
              : mine.filter((n) => n.questionNo === targetOfRowId?.questionNo)
            : mine;
      return scoped.map((n) => ({
        id: n.id,
        questionNo: n.questionNo,
        text: n.text,
        createdAt: n.createdAt,
        resolvedAt: n.resolvedAt,
      }));
    }

    if (fromTable === "generation_jobs") {
      const profileId = ctx.targetProfileId ?? ctx.callerId;
      if (keys.includes("createdAt") && keys.length <= 4) {
        return state.generationJobs
          .filter((j) => j.tenantId === ctx.callerTenantId)
          .map((j) => ({
            id: j.id,
            tenantId: j.tenantId,
            profileId: j.profileId,
            createdAt: j.createdAt,
          }));
      }
      return state.generationJobs
        .filter(
          (j) =>
            j.tenantId === ctx.callerTenantId &&
            (keys.includes("batchId") ? j.status === "pending" : j.profileId === profileId),
        )
        .map((j) => ({
          id: j.id,
          tenantId: j.tenantId,
          profileId: j.profileId,
          batchId: j.batchId,
          status: j.status,
          requested: j.requested,
          succeeded: j.succeeded,
          createdAt: j.createdAt,
        }));
    }

    return [];
  };

  const buildSelectChain = (shape: Record<string, unknown>) => {
    let fromTable = "";
    const chain: Record<string, unknown> = {};

    chain.from = (table: object) => {
      fromTable = tableName(table);
      return chain;
    };
    chain.where = () => chain;
    // orderBy の後に limit を繋ぐクエリ (進行中セットの取得) があるので、 ここでは
    // まだ実行しない。 chain 自体が thenable なので await だけでも解決する。
    chain.orderBy = () => chain;
    chain.limit = (n: number) => Promise.resolve(executeSelect(fromTable, shape, n));
    // biome-ignore lint/suspicious/noThenProperty: drizzle query chain is intentionally thenable in tests
    chain.then = (
      onFulfilled: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => executeSelect(fromTable, shape).then(onFulfilled, onRejected);

    return chain;
  };

  return {
    select: (shape: Record<string, unknown>) => buildSelectChain(shape),
    /**
     * 排他ロック (resource_locks) の解放と期限切れ掃除だけを解釈する。 where 句は
     * 読まないので、 ロック以外のテーブルへの delete は何もしない。
     */
    delete: (table: object) => {
      const name = tableName(table);
      return {
        where: async () => {
          if (name !== "resource_locks") return [];
          // 本番は id + holder (解放) / id + 期限切れ (取り直し) を条件にするが、
          // モックは 1 度に 1 つのロックしか使わないので全消しで足りる。
          state.locks.clear();
          return [];
        },
      };
    },
    insert: (table: object) => {
      const name = tableName(table);
      return {
        values: (data: Record<string, unknown> | Record<string, unknown>[]) => {
          const rows = Array.isArray(data) ? data : [data];
          if (name === "resource_locks") {
            return {
              onConflictDoNothing: () => ({
                returning: async () => {
                  const row = rows[0] as { id: string; holder: string };
                  if (state.lockBusy) return [];
                  if (state.locks.has(row.id)) return [];
                  state.locks.set(row.id, row.holder);
                  return [{ id: row.id }];
                },
              }),
            };
          }
          if (name === "notifications") {
            for (const row of rows) state.notifications.push(row);
            return Promise.resolve(undefined);
          }
          if (name === "interview_prep_assignments") {
            return {
              onConflictDoUpdate: ({ set }: { set: Record<string, unknown> }) => {
                for (const row of rows) {
                  const tenantId = row.tenantId as string;
                  const profileId = row.profileId as string;
                  const key = assignmentKey(tenantId, profileId);
                  const existing = state.assignments.get(key);
                  const merged: InterviewPrepAssignmentRow = {
                    tenantId,
                    profileId,
                    categories: (set.categories ??
                      row.categories ??
                      existing?.categories ??
                      []) as string[],
                    interviewDate: (set.interviewDate ??
                      row.interviewDate ??
                      existing?.interviewDate ??
                      null) as string | null,
                    interviewNote: (set.interviewNote ??
                      row.interviewNote ??
                      existing?.interviewNote ??
                      null) as string | null,
                    assignedBy: (set.assignedBy ??
                      row.assignedBy ??
                      existing?.assignedBy ??
                      null) as string | null,
                  };
                  state.assignments.set(key, merged);
                }
                return Promise.resolve(undefined);
              },
            };
          }
          if (name === "skill_sheets") {
            for (const row of rows) {
              const tenantId = row.tenantId as string;
              const profileId = row.profileId as string;
              const key = skillSheetKey(tenantId, profileId);
              state.skillSheets.set(key, {
                id: (row.id as string) ?? `sheet-${profileId}`,
                tenantId,
                profileId,
                sheet: row.sheet as Record<string, unknown>,
                updatedBy: row.updatedBy as string,
              });
            }
            return {
              onConflictDoUpdate: () => Promise.resolve(undefined),
              returning: async () => [{ id: rows[0]?.id ?? "sheet-1" }],
            };
          }
          if (name === "interview_fix_notes") {
            const created: FixNoteRow[] = rows.map((row, i) => ({
              id: (row.id as string) ?? `fix-note-${state.fixNotes.length + i + 1}`,
              tenantId: row.tenantId as string,
              profileId: row.profileId as string,
              questionNo: row.questionNo as number,
              text: row.text as string,
              createdAt: (row.createdAt as Date | undefined) ?? new Date(),
              resolvedAt: (row.resolvedAt as Date | null | undefined) ?? null,
            }));
            state.fixNotes.push(...created);
            return {
              returning: async () =>
                created.map((n) => ({
                  id: n.id,
                  questionNo: n.questionNo,
                  text: n.text,
                  createdAt: n.createdAt,
                  resolvedAt: n.resolvedAt,
                })),
            };
          }
          if (name === "interview_practice_sets") {
            for (const row of rows) {
              state.practiceSets.push({
                id: row.id as string,
                tenantId: row.tenantId as string,
                profileId: row.profileId as string,
                date: row.date as string,
                questionNos: (row.questionNos as number[] | undefined) ?? [],
                completedNos: (row.completedNos as number[] | undefined) ?? [],
                confidentNos: (row.confidentNos as number[] | undefined) ?? [],
                startedPercent: (row.startedPercent as number | undefined) ?? 0,
                status: (row.status as PracticeSetRow["status"] | undefined) ?? "active",
                version: (row.version as number | undefined) ?? 0,
                createdAt: new Date(Date.now() + state.practiceSets.length),
              });
            }
            return Promise.resolve(undefined);
          }
          if (name === "interview_progress") {
            return {
              /**
               * 本番の upsert は status / practiced_count を SQL 式で更新する。
               * モックは SQL を解釈しないので、 同じ意味を JS で再現する:
               *   - confident は一度立ったら下がらない
               *   - practiced_count は現在値 + 挿入値
               * SM-2 列はルート側が値を計算して渡すのでそのまま入る。
               */
              onConflictDoUpdate: ({ set }: { set: Record<string, unknown> }) => {
                for (const row of rows) {
                  const tenantId = row.tenantId as string;
                  const profileId = row.profileId as string;
                  const questionNo = row.questionNo as number;
                  const existing = state.progress.find(
                    (r) =>
                      r.tenantId === tenantId &&
                      r.profileId === profileId &&
                      r.questionNo === questionNo,
                  );
                  const incomingStatus = row.status as ProgressRow["status"];
                  const merged: ProgressRow = {
                    tenantId,
                    profileId,
                    questionNo,
                    status:
                      incomingStatus === "confident" || existing?.status === "confident"
                        ? "confident"
                        : "read",
                    practicedCount:
                      (existing?.practicedCount ?? 0) + ((row.practicedCount as number) ?? 0),
                    lastPracticedAt:
                      (row.lastPracticedAt as Date | null) ?? existing?.lastPracticedAt ?? null,
                    srsEase: (set.srsEase ?? row.srsEase ?? existing?.srsEase ?? 2.5) as number,
                    srsIntervalDays: (set.srsIntervalDays ??
                      row.srsIntervalDays ??
                      existing?.srsIntervalDays ??
                      0) as number,
                    srsReps: (set.srsReps ?? row.srsReps ?? existing?.srsReps ?? 0) as number,
                    srsDueDate: (set.srsDueDate ??
                      row.srsDueDate ??
                      existing?.srsDueDate ??
                      null) as string | null,
                    lastResult: (set.lastResult ??
                      row.lastResult ??
                      existing?.lastResult ??
                      null) as ProgressRow["lastResult"],
                  };
                  if (existing) Object.assign(existing, merged);
                  else state.progress.push(merged);
                }
                return Promise.resolve(undefined);
              },
            };
          }
          if (name === "generation_jobs") {
            for (const row of rows) {
              state.generationJobs.push({
                id: row.id as string,
                tenantId: row.tenantId as string,
                profileId: row.profileId as string,
                batchId: row.batchId as string,
                status: row.status as GenerationJobRow["status"],
                requested: row.requested as number,
                succeeded: row.succeeded as number,
                createdAt: (row.createdAt as Date | undefined) ?? new Date(),
              });
            }
            return Promise.resolve(undefined);
          }
          if (name === "interview_personal_templates") {
            for (const row of rows) {
              const tenantId = row.tenantId as string;
              const profileId = row.profileId as string;
              const questionNo = row.questionNo as number;
              state.personalTemplates.set(personalTemplateKey(tenantId, profileId, questionNo), {
                id: row.id as string,
                tenantId,
                profileId,
                questionNo,
                content: (row.content as string | null) ?? null,
                draftContent: (row.draftContent as string | null) ?? null,
                generatedFrom: (row.generatedFrom as string | null) ?? null,
                source: row.source as PersonalAnswerTemplateRow["source"],
                updatedBy: (row.updatedBy as string | null) ?? null,
              });
            }
            return {
              onConflictDoUpdate: ({ set }: { set: Record<string, unknown> }) => {
                for (const row of rows) {
                  const tenantId = row.tenantId as string;
                  const profileId = row.profileId as string;
                  const questionNo = row.questionNo as number;
                  const key = personalTemplateKey(tenantId, profileId, questionNo);
                  const existing = state.personalTemplates.get(key);
                  state.personalTemplates.set(key, {
                    id: (row.id as string) ?? existing?.id ?? crypto.randomUUID(),
                    tenantId,
                    profileId,
                    questionNo,
                    content: mergeNullableField(set, row, existing?.content, "content") as
                      | string
                      | null,
                    draftContent: mergeNullableField(
                      set,
                      row,
                      existing?.draftContent,
                      "draftContent",
                    ) as string | null,
                    generatedFrom: mergeNullableField(
                      set,
                      row,
                      existing?.generatedFrom,
                      "generatedFrom",
                    ) as string | null,
                    source: (set.source ?? row.source ?? existing?.source ?? "ai") as
                      | "ai"
                      | "manual",
                    updatedBy: mergeNullableField(set, row, existing?.updatedBy, "updatedBy") as
                      | string
                      | null,
                  });
                }
                return Promise.resolve(undefined);
              },
            };
          }
          return {
            onConflictDoUpdate: () => Promise.resolve(undefined),
          };
        },
      };
    },
    update: (table: object) => {
      const name = tableName(table);
      return {
        set: (set: Record<string, unknown>) => ({
          /**
           * 本番には `.returning()` を呼ばずに await するだけの更新 (練習セットの
           * 消化記録・終了) があるため、 更新自体は where の時点で確定させ、
           * 戻り値を thenable かつ `.returning()` 可能な形にする。
           */
          where: () => {
            const apply = (): unknown[] => {
              if (name === "skill_sheets") {
                const profileId = ctx.targetProfileId ?? ctx.callerId;
                const key = skillSheetKey(ctx.callerTenantId, profileId);
                const existing = state.skillSheets.get(key);
                if (!existing) return [];
                const updated: SkillSheetRow = {
                  ...existing,
                  sheet: (set.sheet as Record<string, unknown>) ?? existing.sheet,
                  updatedBy: (set.updatedBy as string) ?? existing.updatedBy,
                };
                state.skillSheets.set(key, updated);
                return [{ id: updated.id }];
              }
              if (name === "interview_questions") {
                // 質問バンクは本番同様その場で書き換え、 編集の印は別に持つ。
                const bank = state.questions ?? [...TEST_INTERVIEW_QUESTIONS];
                state.questions = bank;
                const target = bank.find((q) => q.no === ctx.questionNo);
                if (!target) return [];
                for (const [key, value] of Object.entries(set)) {
                  if (key === "editedAt" || key === "editedBy") continue;
                  // 列名 (camelCase) を fixture のキー (snake_case) に戻す。
                  const field =
                    key === "answerTemplate"
                      ? "answer_template"
                      : key === "isReverse"
                        ? "is_reverse"
                        : key;
                  (target as Record<string, unknown>)[field] = value;
                }
                if ("editedAt" in set) {
                  const at = set.editedAt as Date | null;
                  if (at === null) state.questionEdits.delete(target.no);
                  else {
                    state.questionEdits.set(target.no, {
                      editedAt: at,
                      editedBy: (set.editedBy as string) ?? ctx.callerId,
                      releaseRequestedAt: (set.releaseRequestedAt as Date | null) ?? null,
                    });
                  }
                } else if ("releaseRequestedAt" in set) {
                  // 解除の予約。 編集済みの印 (editedAt) はそのまま残す。
                  const existing = state.questionEdits.get(target.no);
                  if (existing) {
                    state.questionEdits.set(target.no, {
                      ...existing,
                      releaseRequestedAt: set.releaseRequestedAt as Date | null,
                    });
                  }
                }
                state.afterQuestionUpdate?.();
                return [{ no: target.no }];
              }
              if (name === "interview_personal_templates") {
                const profileId = ctx.targetProfileId ?? ctx.callerId;
                for (const [key, existing] of state.personalTemplates.entries()) {
                  if (
                    existing.profileId !== profileId ||
                    existing.tenantId !== ctx.callerTenantId
                  ) {
                    continue;
                  }
                  state.personalTemplates.set(key, {
                    ...existing,
                    content: mergeNullableField(set, {}, existing.content, "content") as
                      | string
                      | null,
                    draftContent: mergeNullableField(
                      set,
                      {},
                      existing.draftContent,
                      "draftContent",
                    ) as string | null,
                    source: (set.source as PersonalAnswerTemplateRow["source"]) ?? existing.source,
                    updatedBy: mergeNullableField(set, {}, existing.updatedBy, "updatedBy") as
                      | string
                      | null,
                  });
                }
                return [...state.personalTemplates.values()].filter(
                  (t) => t.profileId === profileId,
                );
              }
              if (name === "interview_fix_notes") {
                const target = state.fixNotes.find(
                  (n) =>
                    n.id === ctx.rowId &&
                    n.tenantId === ctx.callerTenantId &&
                    n.profileId === ctx.callerId,
                );
                if (!target) return [];
                target.resolvedAt = (set.resolvedAt as Date | null) ?? null;
                return [
                  {
                    id: target.id,
                    questionNo: target.questionNo,
                    text: target.text,
                    createdAt: target.createdAt,
                    resolvedAt: target.resolvedAt,
                  },
                ];
              }
              if (name === "generation_jobs") {
                for (const job of state.generationJobs) {
                  if (job.tenantId !== ctx.callerTenantId) continue;
                  if (set.status !== undefined)
                    job.status = set.status as GenerationJobRow["status"];
                  if (set.succeeded !== undefined) job.succeeded = set.succeeded as number;
                }
                return state.generationJobs;
              }
              if (name === "interview_practice_sets") {
                // where 句は解釈しないので、 更新対象は :id か進行中のセット。
                const profileId = ctx.targetProfileId ?? ctx.callerId;
                const mine = state.practiceSets.filter(
                  (r) => r.tenantId === ctx.callerTenantId && r.profileId === profileId,
                );
                const target = ctx.rowId
                  ? mine.find((r) => r.id === ctx.rowId)
                  : mine.find((r) => r.status === "active");
                if (!target) return [];
                if (set.questionNos !== undefined) target.questionNos = set.questionNos as number[];
                if (set.completedNos !== undefined)
                  target.completedNos = set.completedNos as number[];
                if (set.confidentNos !== undefined)
                  target.confidentNos = set.confidentNos as number[];
                if (set.status !== undefined)
                  target.status = set.status as PracticeSetRow["status"];
                // 楽観ロック: 本番は version 一致を where で見る。 モックは where 句を
                // 解釈しないので、 版数の進み方だけ再現する (テストは直列なので競合しない)。
                if (set.version !== undefined) target.version = set.version as number;
                return [target];
              }
              return [];
            };
            const result = apply();
            return {
              returning: async () => result,
              // biome-ignore lint/suspicious/noThenProperty: drizzle query chain is intentionally thenable in tests
              then: (
                onFulfilled: (value: unknown[]) => unknown,
                onRejected?: (reason: unknown) => unknown,
              ) => Promise.resolve(result).then(onFulfilled, onRejected),
            };
          },
        }),
      };
    },
  };
}

export async function mintInterviewPrepTestToken(userId: string): Promise<string> {
  return new SignJWT({ email: `${userId}@example.local` })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("stella-api")
    .setAudience("stella-web")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(TEST_JWT_SECRET));
}

export function createInterviewPrepTestEnv(overrides: Partial<Env> = {}): Env {
  return {
    AUTH_JWT_SECRET: TEST_JWT_SECRET,
    ALLOWED_ORIGINS: "http://127.0.0.1:5173",
    DB: {} as D1Database,
    ...overrides,
  } as Env;
}

export const DEFAULT_CATEGORIES = ["PHP"] as const;

export function putAssignmentBody(
  overrides: { categories?: string[]; interviewDate?: string | null; note?: string | null } = {},
): Record<string, unknown> {
  return {
    categories: overrides.categories ?? [...DEFAULT_CATEGORIES],
    ...(overrides.interviewDate !== undefined ? { interviewDate: overrides.interviewDate } : {}),
    ...(overrides.note !== undefined ? { note: overrides.note } : {}),
  };
}
