/**
 * 面談対策 — 講師・営業のモニタリング一覧の集計 (Issue #236)。
 *
 * `GET /api/interview-prep/assignments` が受講者ごとに「準備率 / 最終練習日 / 内訳」を
 * 返すための元データを **テナント単位でまとめて 1 回ずつ** 読む。 受講者ごとに
 * 進捗と個別の型を引くと受講者数ぶんのクエリ (N+1) になるため、 ここで一括して読み、
 * 集計は JS 側 (`visibleQuestions` + `prepRate`) で行う — 準備率の分母は受講者ごとの
 * 割当カテゴリで変わるので、 SQL の GROUP BY だけでは出せない。
 */

import { eq } from "drizzle-orm";

import { visibleQuestions } from "@falcon/shared/interview/filter";
import { deriveQuestionPrepStatus, prepRate } from "@falcon/shared/interview/progress";

import { interviewPersonalTemplates, interviewProgress, interviewQuestions } from "../db/schema.js";
import type { Db } from "../db/client.js";

/** 一覧 1 行ぶんの集計値 (レスポンスにそのまま載る形)。 */
export interface InterviewPrepSummary {
  /** 準備率 (%) — 割当範囲の A 必修のうち `練習OK` の割合。 */
  prepRate: number;
  /** 準備率の分母 (A 必修の問題数)。 割当前は 0。 */
  prepTotal: number;
  /** 4 状態の内訳 (合計は prepTotal に一致する)。 */
  breakdown: { confident: number; drafted: number; read: number; none: number };
  /** 最終練習日時 (ISO)。 一度も練習していなければ null。 */
  lastPracticedAt: string | null;
}

export const EMPTY_INTERVIEW_PREP_SUMMARY: InterviewPrepSummary = {
  prepRate: 0,
  prepTotal: 0,
  breakdown: { confident: 0, drafted: 0, read: 0, none: 0 },
  lastPracticedAt: null,
};

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const at = value instanceof Date ? value : new Date(value);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}

/** ISO 文字列の新しい方を採る (null は「まだ無い」)。 */
function laterIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

/**
 * テナント内の受講者ぶんの準備率・最終練習日をまとめて集計する。
 * `categoriesByProfile` は受講者ごとの割当カテゴリ (割当が無ければ空配列)。
 */
export async function loadInterviewPrepSummaries(
  db: Db,
  tenantId: string,
  categoriesByProfile: Map<string, string[]>,
): Promise<Map<string, InterviewPrepSummary>> {
  const questions = await db
    .select({
      no: interviewQuestions.no,
      categories: interviewQuestions.categories,
      freq: interviewQuestions.freq,
      is_reverse: interviewQuestions.isReverse,
    })
    .from(interviewQuestions)
    .where(eq(interviewQuestions.tenantId, tenantId));

  const progressRows = await db
    .select({
      profileId: interviewProgress.profileId,
      questionNo: interviewProgress.questionNo,
      status: interviewProgress.status,
      lastPracticedAt: interviewProgress.lastPracticedAt,
    })
    .from(interviewProgress)
    .where(eq(interviewProgress.tenantId, tenantId));

  // 個別の型は「回答作成済み」の判定にしか使わないので、 中身が空の行は読まない。
  const templateRows = await db
    .select({
      profileId: interviewPersonalTemplates.profileId,
      questionNo: interviewPersonalTemplates.questionNo,
      content: interviewPersonalTemplates.content,
    })
    .from(interviewPersonalTemplates)
    .where(eq(interviewPersonalTemplates.tenantId, tenantId));

  const statusByProfile = new Map<string, Map<number, "read" | "confident">>();
  const lastPracticedByProfile = new Map<string, string | null>();
  for (const row of progressRows) {
    let byNo = statusByProfile.get(row.profileId);
    if (!byNo) {
      byNo = new Map();
      statusByProfile.set(row.profileId, byNo);
    }
    byNo.set(row.questionNo, row.status);
    lastPracticedByProfile.set(
      row.profileId,
      laterIso(lastPracticedByProfile.get(row.profileId) ?? null, toIso(row.lastPracticedAt)),
    );
  }

  const draftedByProfile = new Map<string, Set<number>>();
  for (const row of templateRows) {
    if (!row.content?.trim()) continue;
    let nos = draftedByProfile.get(row.profileId);
    if (!nos) {
      nos = new Set();
      draftedByProfile.set(row.profileId, nos);
    }
    nos.add(row.questionNo);
  }

  const summaries = new Map<string, InterviewPrepSummary>();
  for (const [profileId, categories] of categoriesByProfile) {
    const visible = visibleQuestions(questions, categories);
    const statusByNo = statusByProfile.get(profileId);
    const draftedNos = draftedByProfile.get(profileId);
    const rate = prepRate(
      visible.map((q) => ({
        freq: q.freq,
        is_reverse: q.is_reverse,
        status: deriveQuestionPrepStatus({
          // 個別の型は A 必修にしか生成しない (enrichQuestionRows と揃える)。
          hasPersonalTemplate: q.freq === "A" && Boolean(draftedNos?.has(q.no)),
          progressStatus: statusByNo?.get(q.no) ?? null,
        }),
      })),
    );
    summaries.set(profileId, {
      prepRate: rate.percent,
      prepTotal: rate.total,
      breakdown: {
        confident: rate.confident,
        drafted: rate.drafted,
        read: rate.read,
        none: rate.none,
      },
      lastPracticedAt: lastPracticedByProfile.get(profileId) ?? null,
    });
  }
  return summaries;
}
