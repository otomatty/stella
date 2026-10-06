/**
 * 提出の AI 一次レビュー (docs/curriculum/07 §6.3・§6.6)。
 *
 * AI に返させる形 (構造化出力の JSON スキーマ) と、返ってきた結果から人に回すかどうかを
 * 決める判定をここに置く。人に回すかどうかは AI に言わせず、ルーブリックの結果と確信度に
 * しきい値をコードで当てて決める。しきい値を変えても AI への指示は変えずに済む。
 */

import type { TaskKind } from "../tasks/manifest.js";
import type { MachineCheck, SupportEvent } from "../tasks/submission.js";

/**
 * しきい値の版。表 (`MIN_CONFIDENCE`) と人に回す条件を変えたら上げる。
 * レビュー結果ごとに記録し、人の判定との一致率を版ごとに比べる (07 §13)。
 */
export const AI_REVIEW_THRESHOLD_VERSION = "2026-10-06";

export const RUBRIC_RESULTS = ["met", "unmet", "undetermined"] as const;
export type RubricResult = (typeof RUBRIC_RESULTS)[number];
export const RUBRIC_RESULT_LABELS: Record<RubricResult, string> = {
  met: "満たす",
  unmet: "満たさない",
  undetermined: "判断できない",
};

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];
export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const FINDING_SEVERITIES = ["major", "minor", "info"] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];
export const FINDING_SEVERITY_LABELS: Record<FindingSeverity, string> = {
  major: "重い",
  minor: "軽い",
  info: "参考",
};

/** 根拠に使える、提出ファイル以外の記録。行番号はそれぞれの本文の行。 */
export const PSEUDO_FILES = {
  explanation: "#explanation",
  debuggingRecord: "#debugging-record",
  localResult: "#local-result",
} as const;

export interface EvidenceRef {
  file: string;
  startLine: number;
  endLine: number;
}
export interface AiRubricResult {
  id: string;
  result: RubricResult;
  evidence: EvidenceRef[];
  note: string;
}
export interface AiFinding extends EvidenceRef {
  severity: FindingSeverity;
  comment: string;
}
export interface AiLearnerReply {
  message: string;
  goodPoints: string[];
  nextSteps: string[];
}
export interface AiReviewOutput {
  rubric: AiRubricResult[];
  confidence: Confidence;
  findings: AiFinding[];
  learnerReply: AiLearnerReply;
}

const evidenceSchema = {
  type: "object",
  properties: {
    file: { type: "string" },
    startLine: { type: "integer" },
    endLine: { type: "integer" },
  },
  required: ["file", "startLine", "endLine"],
  additionalProperties: false,
} as const;

/** 構造化出力 (`output_config.format`) に渡す JSON スキーマ。 */
export const AI_REVIEW_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    rubric: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          result: { type: "string", enum: [...RUBRIC_RESULTS] },
          evidence: { type: "array", items: evidenceSchema },
          note: { type: "string" },
        },
        required: ["id", "result", "evidence", "note"],
        additionalProperties: false,
      },
    },
    confidence: { type: "string", enum: [...CONFIDENCE_LEVELS] },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          file: { type: "string" },
          startLine: { type: "integer" },
          endLine: { type: "integer" },
          severity: { type: "string", enum: [...FINDING_SEVERITIES] },
          comment: { type: "string" },
        },
        required: ["file", "startLine", "endLine", "severity", "comment"],
        additionalProperties: false,
      },
    },
    learnerReply: {
      type: "object",
      properties: {
        message: { type: "string" },
        goodPoints: { type: "array", items: { type: "string" } },
        nextSteps: { type: "array", items: { type: "string" } },
      },
      required: ["message", "goodPoints", "nextSteps"],
      additionalProperties: false,
    },
  },
  required: ["rubric", "confidence", "findings", "learnerReply"],
  additionalProperties: false,
} as const;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isLine = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const MAX_TEXT = 4000;
const text = (v: unknown): v is string => typeof v === "string" && v.length <= MAX_TEXT;
const textList = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 20 && v.every(text);
function isEvidence(v: unknown): v is EvidenceRef {
  return (
    isObject(v) &&
    typeof v.file === "string" &&
    v.file.length <= 300 &&
    isLine(v.startLine) &&
    isLine(v.endLine)
  );
}

/**
 * AI の応答本文を検証して返す。形が違えば null (= AI が判定できなかった)。
 * 構造化出力でも、拒否や打ち切りのときはスキーマに合わない本文が返りうるので必ず通す。
 */
export function parseAiReviewOutput(raw: string): AiReviewOutput | null {
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !isObject(v) ||
    !Array.isArray(v.rubric) ||
    v.rubric.length > 100 ||
    !CONFIDENCE_LEVELS.includes(v.confidence as Confidence) ||
    !Array.isArray(v.findings) ||
    v.findings.length > 100 ||
    !isObject(v.learnerReply)
  )
    return null;
  const reply = v.learnerReply;
  if (!text(reply.message) || !textList(reply.goodPoints) || !textList(reply.nextSteps))
    return null;
  const rubric: AiRubricResult[] = [];
  for (const item of v.rubric) {
    if (
      !isObject(item) ||
      typeof item.id !== "string" ||
      !RUBRIC_RESULTS.includes(item.result as RubricResult) ||
      !Array.isArray(item.evidence) ||
      item.evidence.length > 20 ||
      !item.evidence.every(isEvidence) ||
      !text(item.note)
    )
      return null;
    rubric.push({
      id: item.id,
      result: item.result as RubricResult,
      evidence: item.evidence.map((e) => ({
        file: e.file,
        startLine: e.startLine,
        endLine: e.endLine,
      })),
      note: item.note,
    });
  }
  // 同じ項目を 2 回返した応答は、結果が一致していても形の誤りとして扱う (人に回る)。
  // どちらかを選ぶと、先頭の「満たす」で後ろの「満たさない」を隠しうるため。
  if (new Set(rubric.map((r) => r.id)).size !== rubric.length) return null;
  const findings: AiFinding[] = [];
  for (const f of v.findings) {
    if (
      !isEvidence(f) ||
      !FINDING_SEVERITIES.includes((f as { severity?: unknown }).severity as FindingSeverity) ||
      !text((f as { comment?: unknown }).comment)
    )
      return null;
    const finding = f as unknown as AiFinding;
    findings.push({
      file: finding.file,
      startLine: finding.startLine,
      endLine: finding.endLine,
      severity: finding.severity,
      comment: finding.comment,
    });
  }
  return {
    rubric,
    confidence: v.confidence as Confidence,
    findings,
    learnerReply: {
      message: reply.message,
      goodPoints: [...reply.goodPoints],
      nextSteps: [...reply.nextSteps],
    },
  };
}

/** AI に判定させる項目。規則 (`review.rules`) と課題固有の項目 (`review.rubric`) を並べたもの。 */
export interface ReviewRubricItem {
  id: string;
  criterion: string;
  required: boolean;
  /** コーディング規則の項目なら true。 */
  rule: boolean;
}

/** 課題ごとの、人に回す条件の追加分 (`task.json` の `review.escalateWhen`)。 */
export const ESCALATE_WHEN = ["optional-unmet", "major-finding"] as const;
export type EscalateWhen = (typeof ESCALATE_WHEN)[number];
export const ESCALATE_WHEN_LABELS: Record<EscalateWhen, string> = {
  "optional-unmet": "任意の項目に「満たさない」がある",
  "major-finding": "重さが「重い」の所見がある",
};

export const ROUTE_REASONS = [
  "machine-check",
  "unallowed-support",
  "consult",
  "ai-unavailable",
  "no-rubric",
  "rubric-unmet",
  "rubric-undetermined",
  "low-confidence",
  "misplaced-finding",
  "task-condition",
  "solution-leak",
] as const;
export type RouteReason = (typeof ROUTE_REASONS)[number];
export const ROUTE_REASON_LABELS: Record<RouteReason, string> = {
  "machine-check": "機械の照合で食い違いがある",
  "unallowed-support": "確認A・Bで許されていない支援の記録がある",
  consult: "受講者が講師への相談を求めた",
  "ai-unavailable": "AI が判定できなかった",
  "no-rubric": "課題に必須の評価項目がない",
  "rubric-unmet": "必須項目に「満たさない」がある",
  "rubric-undetermined": "必須項目に「判断できない」がある",
  "low-confidence": "確信度がしきい値に届かない",
  "misplaced-finding": "所見が提出に無いファイル・行を指している",
  "task-condition": "課題ごとの追加条件に当たった",
  "solution-leak": "返信が解答例のコードと重なった",
};

/** AI が判定できなかった理由。どれも人に回す (07 §6.3)。 */
export const AI_FAILURES = [
  "unavailable",
  "refusal",
  "timeout",
  "invalid-format",
  "too-large",
  "error",
] as const;
export type AiFailure = (typeof AI_FAILURES)[number];
export const AI_FAILURE_LABELS: Record<AiFailure, string> = {
  unavailable: "AI のレビューを使えない設定です",
  refusal: "AI が回答を拒否しました",
  timeout: "AI の応答が時間内に返りませんでした",
  "invalid-format": "AI の応答の形式が誤っていました",
  "too-large": "提出が大きく AI に渡せませんでした",
  error: "AI の呼び出しに失敗しました",
};

/** 証拠になる課題 (統合・確認A・確認B)。確信度が高のときだけ AI で確定する。 */
export function isEvidenceKind(kind: string): boolean {
  return kind === "integration" || kind === "assessment-a" || kind === "assessment-b";
}
export function isAssessmentKind(kind: string): boolean {
  return kind === "assessment-a" || kind === "assessment-b";
}

/** AI で確定するのに要る最低の確信度 (07 §6.3 のおすすめの値)。 */
export function minimumConfidence(kind: string): Confidence {
  return isEvidenceKind(kind) ? "high" : "medium";
}

const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

/** 種別ごとに AI が重く見る規則 (07 §6.2)。指示の中で使う。 */
export const KIND_REVIEW_FOCUS: Record<TaskKind, string> = {
  basic: "単元で教えた書き方、命名、既習の規則",
  connection: "単元で教えた書き方、命名、既習の規則",
  independent: "構成と責務の分け方、説明とコードの一致",
  debug: "記録と差分の整合、変更が必要な範囲に収まっているか",
  integration: "既存コードの書き方と部品の契約に合わせているか、責務の置き場所",
  "assessment-a": "統合までの観点に加え、説明が自分の設計判断を述べているか",
  "assessment-b": "統合までの観点に加え、説明が自分の設計判断を述べているか",
};

/**
 * AI の判定によらず人に回す条件のうち、提出の時点で分かるもの。
 * 機械の照合の食い違い・確認A・Bの支援・相談は、AI の結果を待たずに人のキューへ入れる。
 */
export function forcedHumanReasons(input: {
  kind: string | null;
  mode: string | null;
  machineCheck: MachineCheck | null;
  support: SupportEvent[] | null;
}): RouteReason[] {
  const reasons: RouteReason[] = [];
  if (input.mode === "consult") reasons.push("consult");
  // 相談の理由は照合結果にも入る (`verifyTaskSubmission`)。それ以外の食い違いだけを数える。
  const mismatches = (input.machineCheck?.reasons ?? []).filter(
    (r) => r !== "受講者が講師への相談を求めています",
  );
  if (
    !input.machineCheck ||
    (!input.machineCheck.matched && (mismatches.length > 0 || input.mode !== "consult"))
  )
    reasons.push("machine-check");
  // 確認A・Bはヒント・解答・固定の開始点・実装支援をどれも使わずに解く (07 §8)。
  if (isAssessmentKind(input.kind ?? "") && (input.support?.length ?? 0) > 0)
    reasons.push("unallowed-support");
  return reasons;
}

/** 根拠のファイルと行の範囲。提出ファイルと説明などの記録の行数。 */
export type LineCounts = ReadonlyMap<string, number>;

/** 根拠・所見の箇所が、提出に実在するファイル (記録) と行の範囲を指しているか。 */
export function isValidLocation(ref: EvidenceRef, lines: LineCounts): boolean {
  const count = lines.get(ref.file);
  return (
    count !== undefined &&
    ref.startLine >= 1 &&
    ref.startLine <= ref.endLine &&
    ref.endLine <= count
  );
}

function validEvidence(evidence: EvidenceRef[], lines: LineCounts): EvidenceRef[] {
  return evidence.filter((e) => isValidLocation(e, lines));
}

export interface NormalizedRubricResult extends AiRubricResult {
  criterion: string;
  required: boolean;
  rule: boolean;
}

/**
 * 課題の項目に AI の結果を当てる。AI が返さなかった項目と 2 回以上返した項目は「判断できない」、
 * 課題に無い項目は捨てる。根拠は提出に実在するファイルと行の範囲だけを残す。
 */
export function normalizeRubricResults(
  rubric: ReviewRubricItem[],
  output: AiReviewOutput,
  lines: LineCounts,
): NormalizedRubricResult[] {
  return rubric.map((item) => {
    const matches = output.rubric.filter((r) => r.id === item.id);
    // `parseAiReviewOutput` は重複を弾くが、ここでも 2 件以上なら「判断できない」に倒す。
    const found = matches.length === 1 ? matches[0] : undefined;
    return {
      id: item.id,
      criterion: item.criterion,
      required: item.required,
      rule: item.rule,
      result: found?.result ?? "undetermined",
      evidence: found ? validEvidence(found.evidence, lines) : [],
      note: found?.note ?? "",
    };
  });
}

/**
 * 確信度を根拠の有無で抑える。07 §6.3 の定義どおり、必須項目のどれかに提出の該当箇所を
 * 示せていなければ「低」とする。AI が自分で付けた確信度はそれより上げない。
 */
export function effectiveConfidence(
  reported: Confidence,
  results: NormalizedRubricResult[],
): Confidence {
  const unsupported = results.some((r) => r.required && r.evidence.length === 0);
  return unsupported ? "low" : reported;
}

/** 人がレビューする前に記録する、AI の判定案。一致率の評価に使う (07 §6.6)。 */
export function proposedVerdict(results: NormalizedRubricResult[]): "pass" | "resubmit" | null {
  const required = results.filter((r) => r.required);
  if (required.some((r) => r.result === "unmet")) return "resubmit";
  if (required.length > 0 && required.every((r) => r.result === "met")) return "pass";
  return null;
}

export interface RoutingInput {
  kind: string;
  rubric: ReviewRubricItem[];
  escalateWhen: readonly string[];
  /** 提出の時点で分かる、人に回す条件 (`forcedHumanReasons`)。 */
  forced: RouteReason[];
  /** AI が判定できなかったときは null。 */
  output: AiReviewOutput | null;
  lines: LineCounts;
  /** 返信が解答例と重なり、人に回すと決めたとき true (確認A・B)。 */
  leakEscalates: boolean;
}
export interface RoutingDecision {
  outcome: "confirmed" | "escalated";
  reasons: RouteReason[];
  confidence: Confidence | null;
  results: NormalizedRubricResult[];
  proposedVerdict: "pass" | "resubmit" | null;
  /**
   * AI の所見ごとに、箇所が提出に実在するか (`output.findings` と同じ並び)。
   * 受講者に見せるのは true のものだけ。AI の原文は記録にそのまま残す。
   */
  findingsValid: boolean[];
}

/**
 * 人に回すかどうかを決める (07 §6.3)。
 *
 * - 基礎・接続・自力・修正 (練習): 確信度が高・中で必須項目をすべて満たせば AI で確定
 * - 統合・確認A・確認B: 確信度が高で必須項目をすべて満たせば AI で確定
 * - それ以外と、AI の判定によらず人に回す条件に当たったものは人に回す
 */
export function decideRouting(input: RoutingInput): RoutingDecision {
  const reasons = new Set<RouteReason>(input.forced);
  let confidence: Confidence | null = null;
  let results: NormalizedRubricResult[] = [];
  const findingsValid = (input.output?.findings ?? []).map((f) => isValidLocation(f, input.lines));
  if (!input.output) {
    reasons.add("ai-unavailable");
  } else {
    results = normalizeRubricResults(input.rubric, input.output, input.lines);
    confidence = effectiveConfidence(input.output.confidence, results);
    const required = results.filter((r) => r.required);
    if (required.length === 0) reasons.add("no-rubric");
    if (required.some((r) => r.result === "unmet")) reasons.add("rubric-unmet");
    if (required.some((r) => r.result === "undetermined")) reasons.add("rubric-undetermined");
    if (CONFIDENCE_RANK[confidence] < CONFIDENCE_RANK[minimumConfidence(input.kind)])
      reasons.add("low-confidence");
    if (
      input.escalateWhen.includes("optional-unmet") &&
      results.some((r) => !r.required && r.result === "unmet")
    )
      reasons.add("task-condition");
    // 重い所見は箇所が誤っていても数える (箇所の誤りで人に回す条件を外さない)。
    if (
      input.escalateWhen.includes("major-finding") &&
      input.output.findings.some((f) => f.severity === "major")
    )
      reasons.add("task-condition");
    // 提出に無いファイル・行を指す所見は、受講者に見せない (呼び出し側が外す)。根拠の付いた
    // ルーブリックの結果で確定できる練習はそのまま確定してよいが、スキルの証拠になる課題
    // (統合・確認A・B) は、AI の出力の一部が提出と合わない時点で人に回す。
    if (isEvidenceKind(input.kind) && findingsValid.some((valid) => !valid))
      reasons.add("misplaced-finding");
  }
  if (input.leakEscalates) reasons.add("solution-leak");
  const ordered = ROUTE_REASONS.filter((r) => reasons.has(r));
  return {
    outcome: ordered.length === 0 ? "confirmed" : "escalated",
    reasons: ordered,
    confidence,
    results,
    proposedVerdict: input.output ? proposedVerdict(results) : null,
    findingsValid,
  };
}

/** 提出ごとの AI の状態。queued = AI が確認中、escalated = 人に回した。 */
export type AiReviewStatus = "queued" | "confirmed" | "escalated" | "superseded";
export const AI_REVIEW_STATUS_LABELS: Record<AiReviewStatus, string> = {
  queued: "AI が確認中",
  confirmed: "AI で合格",
  escalated: "講師の確認待ち",
  superseded: "新しい提出に置き換え",
};

/** staff に返す AI 一次レビューの記録 (`ai_reviews` の行)。 */
export interface AiReviewRecord {
  id: string;
  outcome: "confirmed" | "escalated";
  routeReasons: RouteReason[];
  confidence: Confidence | null;
  reportedConfidence: Confidence | null;
  proposedVerdict: "pass" | "resubmit" | null;
  rubricResults: NormalizedRubricResult[];
  findings: AiFinding[];
  draftReply: AiLearnerReply | null;
  learnerReply: LearnerAiFeedback | null;
  leakCheck: { hits: number[]; fragments: string[]; action: string } | null;
  appliedRules: { id: string; required: boolean; contentHash: string | null }[];
  ruleSetHash: string | null;
  failure: AiFailure | null;
  model: string | null;
  promptVersion: string;
  thresholdVersion: string;
  disposition: "applied" | "superseded" | null;
  createdAt: string;
}

/** AI で確定した提出の、受講者に見せる所見と返信。 */
export interface LearnerAiFeedback extends AiLearnerReply {
  findings: AiFinding[];
}

/** 受講者への返信を、総評 (`review_notes`) に入れる文に整える。 */
export function formatLearnerReply(reply: AiLearnerReply): string {
  const parts = [reply.message.trim()];
  if (reply.goodPoints.length > 0)
    parts.push(["良かった点", ...reply.goodPoints.map((p) => `- ${p}`)].join("\n"));
  if (reply.nextSteps.length > 0)
    parts.push(["次に試すこと", ...reply.nextSteps.map((p) => `- ${p}`)].join("\n"));
  return parts.filter(Boolean).join("\n\n");
}
