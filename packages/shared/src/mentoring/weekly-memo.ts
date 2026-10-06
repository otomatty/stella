/**
 * 週次の育成メモ (#38・07 §6.5)。担当講師が 5 分で読み、一言の声掛けかペースの調整をする。
 *
 * - 材料 (`MentorMemoMaterial`) はサーバーが集計した数字と、課題・スキル・評価項目の名前だけ。
 *   受講者の名前・メール・コード・メッセージは持たない (AI に渡すのもこの材料だけ)。
 * - AI の出力 (`MentorMemoOutput`) は構造化出力で受け取り、ここで形を確かめる。
 *   API キーが無い・AI が失敗したときは `buildFallbackMemo` が同じ形の機械的な要約を作る。
 * - メモは講師向け。受講者本人の API からは返さない (07 §6.3 の「人が確定する前の AI の所見を
 *   受講者に見せない」も守る)。
 */

import type { RouteReason } from "../review/ai-review.js";
import { ROUTE_REASON_LABELS } from "../review/ai-review.js";
import {
  EVIDENCE_LEVEL_LABELS,
  type EvidenceLevel,
  SUPPORT_RECORD_LABELS,
  type SupportRecordKind,
} from "../tasks/support-record.js";

/** つまずきの検知の種類 (`notifications.payload.signal`)。 */
export const STUMBLE_SIGNALS = [
  "local-failures",
  "idle",
  "assessment-b",
  "review-escalations",
] as const;
export type StumbleSignal = (typeof STUMBLE_SIGNALS)[number];
export const STUMBLE_SIGNAL_LABELS: Record<StumbleSignal, string> = {
  "local-failures": "同じ課題で手元の失敗が続く",
  idle: "学習が止まる",
  "assessment-b": "確認Bに落ちる",
  "review-escalations": "人に回る提出が続く",
};

/** 講師に勧める対応。message = 一言の声掛け、pace = ペースの調整、watch = 様子見。 */
export const MEMO_ACTIONS = ["message", "pace", "watch"] as const;
export type MemoAction = (typeof MEMO_ACTIONS)[number];
export const MEMO_ACTION_LABELS: Record<MemoAction, string> = {
  message: "一言の声掛け",
  pace: "ペースの調整",
  watch: "様子見",
};

/** 1 週間の材料。週は月曜〜日曜 (日本時間)。 */
export interface MentorMemoMaterial {
  week: { start: string; end: string };
  /** 生成した日の学習ペース。計算できなければ null。 */
  pace: {
    weeklyHours: number;
    /** 進んだ予定時間 (時間、小数第 1 位)。 */
    completedHours: number;
    /** 今日までの目安 (時間)。 */
    expectedHours: number;
    /** 目安との差 (時間)。負なら遅れ。 */
    differenceHours: number;
    delayDays: number;
    /** 差が週の時間を超えた (担当講師に知らせる条件)。 */
    needsInstructor: boolean;
    started: boolean;
  } | null;
  activity: {
    /** 学習の記録 (視聴・完了・提出) がある日数。 */
    activeDays: number;
    studyMinutes: number;
    completedLessons: number;
    submissions: number;
  };
  /** その週に初めて合格した課題 (最大 10 件) と総数。 */
  passedTasks: { title: string; kind: string }[];
  passedTaskCount: number;
  skills: {
    /** 今の水準ごとのスキル数 (スキルごとに最も高い水準で数える)。 */
    counts: Record<EvidenceLevel, number>;
    /** その週に水準が上がった・初めて付いたスキル (最大 10 件)。 */
    changed: { skill: string; level: EvidenceLevel }[];
  };
  /** その週に担当講師へ送ったつまずきの知らせ。 */
  stumbles: Partial<Record<StumbleSignal, number>>;
  /** 生成した時点で続いている手元の失敗 (最大 5 件)。 */
  failureStreaks: { title: string; streak: number }[];
  /** その週の支援の量 (人のレビューは `reviews` で数える)。 */
  support: Partial<Record<SupportRecordKind, number>>;
  reviews: {
    aiConfirmed: number;
    aiEscalated: number;
    escalationReasons: Partial<Record<RouteReason, number>>;
    /** 人に回った判定で「満たさない」「判断できない」だった必須項目 (最大 5 件)。 */
    unmetCriteria: { criterion: string; count: number }[];
    humanPass: number;
    humanResubmit: number;
  };
}

/** AI (と機械的な要約) が書く本文。 */
export interface MentorMemoOutput {
  summary: string;
  observations: string[];
  suggestedAction: MemoAction;
  actionReason: string;
  /** 講師が受講者に送る一言の案。講師が直して送る。 */
  messageDraft: string;
}

/** 講師の対応の記録。 */
export interface MentorMemoActionRecord {
  kind: MemoAction;
  at: string;
  by: string;
  /** 送った一言、または調整後のペース。 */
  detail?: string;
}

/** 講師の画面に返すメモ。 */
export interface MentorMemoView {
  id: string;
  learnerId: string;
  learnerName: string;
  weekStart: string;
  weekEnd: string;
  state: "queued" | "ready";
  source: "ai" | "fallback" | null;
  summary: string | null;
  observations: string[];
  suggestedAction: MemoAction | null;
  actionReason: string | null;
  messageDraft: string | null;
  material: MentorMemoMaterial | null;
  model: string | null;
  promptVersion: string | null;
  generatedAt: string | null;
  actions: MentorMemoActionRecord[];
  handledAt: string | null;
}

/** 受講者への一言の上限 (文字)。 */
export const MEMO_MESSAGE_MAX = 500;

export const MENTOR_MEMO_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    observations: { type: "array", items: { type: "string" } },
    suggestedAction: { type: "string", enum: [...MEMO_ACTIONS] },
    actionReason: { type: "string" },
    messageDraft: { type: "string" },
  },
  required: ["summary", "observations", "suggestedAction", "actionReason", "messageDraft"],
  additionalProperties: false,
} as const;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;

/** AI の応答を確かめる。形が違う・長すぎる応答は null (機械的な要約に切り替える)。 */
export function parseMentorMemoOutput(raw: string): MentorMemoOutput | null {
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !isObject(v) ||
    !text(v.summary, 1000) ||
    !Array.isArray(v.observations) ||
    v.observations.length > 8 ||
    !v.observations.every((o) => text(o, 400)) ||
    !MEMO_ACTIONS.includes(v.suggestedAction as MemoAction) ||
    !text(v.actionReason, 600) ||
    !text(v.messageDraft, MEMO_MESSAGE_MAX)
  )
    return null;
  return {
    summary: v.summary.trim(),
    observations: (v.observations as string[]).map((o) => o.trim()),
    suggestedAction: v.suggestedAction as MemoAction,
    actionReason: v.actionReason.trim(),
    messageDraft: v.messageDraft.trim(),
  };
}

const hours = (n: number) => n.toLocaleString("ja-JP", { maximumFractionDigits: 1 });
const sum = (values: Partial<Record<string, number>>) =>
  Object.values(values).reduce<number>((a, b) => a + (b ?? 0), 0);
const listCounts = <K extends string>(
  values: Partial<Record<K, number>>,
  labels: Record<K, string>,
) =>
  (Object.entries(values) as [K, number | undefined][])
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([k, n]) => `${labels[k] ?? k} ${n}`)
    .join(" · ");

/** 材料を 1 行ずつの事実にする。講師の画面の「材料」と機械的な要約の両方で使う。 */
export function materialFacts(m: MentorMemoMaterial): string[] {
  const facts: string[] = [];
  if (!m.pace) facts.push("学習ペース: 計算できませんでした");
  else if (!m.pace.started) facts.push(`学習ペース: 未開始 (週${hours(m.pace.weeklyHours)}時間)`);
  else
    facts.push(
      `学習ペース: 目安との差 ${m.pace.differenceHours >= 0 ? "+" : "−"}${hours(Math.abs(m.pace.differenceHours))}時間 (進んだ予定 ${hours(m.pace.completedHours)} / 目安 ${hours(m.pace.expectedHours)}時間 · 週${hours(m.pace.weeklyHours)}時間)`,
    );
  const a = m.activity;
  facts.push(
    `学習の記録: ${a.activeDays}日 · 視聴 ${a.studyMinutes}分 · 完了したレッスン ${a.completedLessons} · 提出 ${a.submissions}`,
  );
  facts.push(
    `合格した課題: ${m.passedTaskCount}件${m.passedTasks.length ? ` (${m.passedTasks.map((t) => `「${t.title}」`).join("")})` : ""}`,
  );
  const levels = listCounts(m.skills.counts, EVIDENCE_LEVEL_LABELS);
  facts.push(
    `スキル: ${levels || "まだ証拠がありません"}${m.skills.changed.length ? ` · この週に上がった ${m.skills.changed.map((s) => `${s.skill} (${EVIDENCE_LEVEL_LABELS[s.level]})`).join("、")}` : ""}`,
  );
  const stumbles = listCounts(m.stumbles, STUMBLE_SIGNAL_LABELS);
  facts.push(`つまずきの知らせ: ${stumbles || "なし"}`);
  if (m.failureStreaks.length)
    facts.push(
      `続いている手元の失敗: ${m.failureStreaks.map((s) => `「${s.title}」${s.streak}回`).join("、")}`,
    );
  facts.push(`支援: ${listCounts(m.support, SUPPORT_RECORD_LABELS) || "なし"}`);
  const r = m.reviews;
  const reasons = listCounts(r.escalationReasons, ROUTE_REASON_LABELS);
  facts.push(
    `レビュー: AI で合格 ${r.aiConfirmed} · 人に回った ${r.aiEscalated}${reasons ? ` (${reasons})` : ""} · 講師の合格 ${r.humanPass} · 講師の再提出 ${r.humanResubmit}`,
  );
  if (r.unmetCriteria.length)
    facts.push(
      `満たせなかった項目: ${r.unmetCriteria.map((c) => `${c.criterion} (${c.count})`).join("、")}`,
    );
  return facts;
}

/** 機械的に決める勧め。AI が無いときと、講師の画面の既定に使う。 */
export function fallbackAction(m: MentorMemoMaterial): MemoAction {
  if (m.pace?.needsInstructor) return "pace";
  if (
    sum(m.stumbles) > 0 ||
    m.failureStreaks.length > 0 ||
    m.reviews.aiEscalated > 0 ||
    (m.support.consult ?? 0) > 0 ||
    m.activity.activeDays === 0
  )
    return "message";
  return "watch";
}

/** API キーが無い・AI が失敗したときの機械的な要約。材料の数字だけで書く。 */
export function buildFallbackMemo(m: MentorMemoMaterial): MentorMemoOutput {
  const action = fallbackAction(m);
  const pace = m.pace?.started
    ? m.pace.differenceHours >= 0
      ? `予定どおりに進んでいます (目安との差 +${hours(m.pace.differenceHours)}時間)。`
      : `目安より${hours(-m.pace.differenceHours)}時間遅れています。`
    : "学習ペースはまだ計算されていません。";
  const activity =
    m.activity.activeDays === 0
      ? "この週は学習の記録がありませんでした。"
      : `この週は${m.activity.activeDays}日学習し、課題に${m.passedTaskCount}件合格しました。`;
  const stumbles = sum(m.stumbles);
  const reasons: Record<MemoAction, string> = {
    pace: "目安との差が週の学習時間を超えています。週の時間や開始日を相談してください。",
    message:
      m.activity.activeDays === 0
        ? "学習の記録がない週でした。様子を聞いてください。"
        : stumbles > 0 || m.failureStreaks.length > 0
          ? "つまずきの知らせ、または続いている手元の失敗があります。"
          : "人に回った提出か、講師への相談がありました。",
    watch: "予定どおりに進み、つまずきの知らせもありません。",
  };
  const drafts: Record<MemoAction, string> = {
    pace: "先週もおつかれさまでした。今の週の学習時間だと予定より少し遅れ気味なので、無理のないペースに一緒に調整しませんか。都合のよい時間を教えてください。",
    message:
      m.activity.activeDays === 0
        ? "最近の様子はいかがですか。忙しい時期でしたら、ペースの相談にも乗ります。気軽に声を掛けてください。"
        : "先週もおつかれさまでした。詰まっているところがあれば、一人で抱えずに講師への相談から気軽に聞いてください。",
    watch:
      "先週もよく進めていますね。この調子で続けましょう。困ったことがあれば、いつでも相談してください。",
  };
  return {
    summary: `${pace}${activity}${stumbles > 0 ? `つまずきの知らせが${stumbles}件ありました。` : ""}`,
    observations: materialFacts(m).slice(0, 6),
    suggestedAction: action,
    actionReason: reasons[action],
    messageDraft: drafts[action],
  };
}
