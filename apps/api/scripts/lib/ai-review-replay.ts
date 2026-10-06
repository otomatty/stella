/**
 * AI 一次レビューの候補 (モデル・指示の版) を、人がレビューした過去の提出に当て直して比べる
 * (リプレイ。07 §6.6・§6.8)。CLI は `scripts/ai-review-replay.ts`。
 *
 * 判定がずれると比べる意味がなくなるので、本番の関数をそのまま使い、写さない。
 * - 素材: 提出を受け付けた時点の素材の版・規則の版・提出ファイルを `loadMaterial` で集める。
 * - 入力: `buildAiReviewPrompt` に候補の指示の版を渡して組み立てる (組み立て方は本番と同じ)。
 * - 要求: `aiReviewRequest` → `jsonSchemaRequestParams` で、本番と同じ本文を Batch に投入する。
 * - 判定: 応答を `interpretAiCompletion` で読み、`judgeAiReview` でしきい値と解答例の照合を当てる。
 *
 * 本番が AI を呼ばない提出 (素材の版が残っていない・規則の版が食い違う・教材や提出ファイルを
 * 読めない・大きすぎる) は、候補によらず同じ結果になるので「判定しない」として比べる母数から外し、
 * 理由ごとの件数だけを出す。
 *
 * AI に送るのは本番の AI 一次レビューと同じ内容だけで、受講者の名前・メール・ID は入らない。
 * 手元に残す状態 (`ReplayState`) には判定に使う提出の本文が入るので、gitignore された
 * 置き場所に書く。結果 (`ReplayReport`) には提出 ID・課題・判定だけを残す。
 */

import type {
  MessageBatchIndividualResponse,
  MessageBatchRequestCounts,
} from "@anthropic-ai/sdk/resources/messages/batches.js";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages/messages.js";
import {
  AI_FAILURE_LABELS,
  AI_REVIEW_THRESHOLD_VERSION,
  type AiFailure,
  isEvidenceKind,
  ROUTE_REASON_LABELS,
  ROUTE_REASONS,
  type RouteReason,
} from "@stella/shared/review/ai-review";
import { exceedsAlert, ratio, REVIEW_METRIC_ALERTS } from "@stella/shared/review/review-desk";
import { eq } from "drizzle-orm";
import type { Db } from "../../src/db/client.js";
import { submissions } from "../../src/db/schema.js";
import type { Env } from "../../src/env.js";
import {
  type AiReviewJudgeMaterial,
  aiReviewRequest,
  interpretAiCompletion,
  judgeAiReview,
  judgeMaterialOf,
  loadMaterial,
  submissionForcedReasons,
} from "../../src/lib/ai-review.js";
import {
  AI_REVIEW_PROMPT_VERSION,
  AI_REVIEW_PROMPTS,
  type AiReviewPromptVersion,
  buildAiReviewPrompt,
  isAiReviewPromptVersion,
  MAX_REVIEW_INPUT_CHARS,
} from "../../src/lib/ai-review-prompt.js";
import {
  jsonSchemaRequestParams,
  readJsonSchemaCompletion,
} from "../../src/lib/anthropic-complete.js";
import type { EvalExample } from "./ai-review-eval.js";

// ---------------------------------------------------------------
// 候補と引数
// ---------------------------------------------------------------

/** 候補 = モデル ID と指示の版。しきい値は本番の版 (`AI_REVIEW_THRESHOLD_VERSION`) で当てる。 */
export interface ReplayCandidate {
  /** 表と結果に出す名前 (`<モデル>@<指示の版>`)。 */
  label: string;
  model: string;
  promptVersion: AiReviewPromptVersion;
}

/**
 * `<モデル>@<指示の版>` を読む。モデルを省くと本番の既定のモデル、版を省くと本番の版。
 * 版は登録簿 (`AI_REVIEW_PROMPTS`) に載っているものだけ。
 */
export function parseCandidate(spec: string, defaultModel: string): ReplayCandidate {
  const at = spec.lastIndexOf("@");
  const model = (at >= 0 ? spec.slice(0, at) : spec).trim() || defaultModel;
  const version = (at >= 0 ? spec.slice(at + 1) : "").trim() || AI_REVIEW_PROMPT_VERSION;
  if (!isAiReviewPromptVersion(version))
    throw new Error(
      `指示の版 ${version} は登録簿 (AI_REVIEW_PROMPTS) にありません。登録済み: ${Object.keys(AI_REVIEW_PROMPTS).join(", ")}`,
    );
  if (!/^[A-Za-z0-9._:-]+$/.test(model))
    throw new Error(`モデル ID の形が正しくありません: ${model}`);
  return { label: `${model}@${version}`, model, promptVersion: version };
}

export type ReplayArgs =
  | {
      mode: "prepare";
      remote: boolean;
      /** `ai-review:eval --out` で書き出した評価用データ (JSONL)。null なら D1 から読む。 */
      data: string | null;
      candidates: ReplayCandidate[];
      /** AI に送る提出の件数の上限。`--run` には必須。 */
      limit: number | null;
      /** true のときだけ Batch に投入する (既定は dry-run)。 */
      run: boolean;
    }
  | { mode: "collect"; dir: string };

const FLAGS_WITH_VALUE = new Set(["--data", "--candidate", "--limit", "--collect"]);
const FLAGS = new Set([...FLAGS_WITH_VALUE, "--remote", "--run"]);

/** 引数を読む。`--run` と `--limit` が無ければ API を呼ばない (dry-run)。 */
export function parseReplayArgs(argv: string[], defaultModel: string): ReplayArgs {
  const values = new Map<string, string[]>();
  const switches = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i] ?? "";
    if (!FLAGS.has(flag)) throw new Error(`知らない引数です: ${flag}`);
    if (!FLAGS_WITH_VALUE.has(flag)) {
      switches.add(flag);
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${flag} に値がありません`);
    values.set(flag, [...(values.get(flag) ?? []), value]);
    i++;
  }
  const single = (flag: string) => {
    const list = values.get(flag) ?? [];
    if (list.length > 1) throw new Error(`${flag} は 1 回だけ指定できます`);
    return list[0] ?? null;
  };
  const collect = single("--collect");
  if (collect !== null) {
    if (values.size > 1 || switches.size > 0)
      throw new Error("--collect はほかの引数と一緒に使えません");
    return { mode: "collect", dir: collect };
  }
  const limitText = single("--limit");
  const limit = limitText === null ? null : Number(limitText);
  if (limit !== null && (!Number.isSafeInteger(limit) || limit < 1))
    throw new Error(`--limit は 1 以上の整数です: ${limitText}`);
  const run = switches.has("--run");
  if (run && limit === null)
    throw new Error("--run には --limit <件数> が要ります (AI に送る提出の件数の上限)");
  const specs = values.get("--candidate") ?? [""];
  const candidates = specs.map((spec) => parseCandidate(spec, defaultModel));
  const labels = new Set(candidates.map((c) => c.label));
  if (labels.size !== candidates.length) throw new Error("同じ候補が 2 回指定されています");
  return {
    mode: "prepare",
    remote: switches.has("--remote"),
    data: single("--data"),
    candidates,
    limit,
    run,
  };
}

// ---------------------------------------------------------------
// 評価用データ → 当て直す提出
// ---------------------------------------------------------------

/** 判定 1 件の要約 (本番の記録と候補で同じ形)。 */
export interface ReplayDecision {
  outcome: "confirmed" | "escalated";
  routeReasons: string[];
  confidence: string | null;
  proposedVerdict: "pass" | "resubmit" | null;
  /** AI が判定できなかった理由 (拒否・形の誤りなど)。 */
  failure: string | null;
}

export interface ReplaySubject {
  submissionId: string;
  taskId: string;
  taskKind: string;
  humanVerdict: EvalExample["humanVerdict"];
  /** 本番がその提出に記録した最新の AI の結果 (候補と並べる基準)。 */
  production: ReplayDecision & {
    model: string | null;
    promptVersion: string;
    thresholdVersion: string;
  };
}

/**
 * 評価用データ (AI の結果 1 件ごとの行) を提出ごとにまとめる。同じ提出の行が複数あれば
 * 後の行 (新しい AI の結果) を本番の記録にする。並びは提出が最初に現れた順。
 */
export function subjectsOf(examples: EvalExample[]): ReplaySubject[] {
  const bySubmission = new Map<string, ReplaySubject>();
  for (const e of examples)
    bySubmission.set(e.submissionId, {
      submissionId: e.submissionId,
      taskId: e.taskId,
      taskKind: e.taskKind,
      humanVerdict: e.humanVerdict,
      production: {
        outcome: e.outcome,
        routeReasons: e.routeReasons,
        confidence: e.confidence,
        proposedVerdict: e.proposedVerdict,
        failure: e.failure,
        model: e.model,
        promptVersion: e.promptVersion,
        thresholdVersion: e.thresholdVersion,
      },
    });
  return [...bySubmission.values()];
}

const VERDICTS = new Set(["pass", "resubmit", "fail"]);

/** `ai-review:eval --out` の JSONL を読む。形が違う行があれば止める。 */
export function parseEvalJsonl(text: string): EvalExample[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const v = JSON.parse(line) as Partial<EvalExample>;
      if (
        typeof v.submissionId !== "string" ||
        typeof v.taskId !== "string" ||
        typeof v.taskKind !== "string" ||
        (v.outcome !== "confirmed" && v.outcome !== "escalated") ||
        !Array.isArray(v.routeReasons) ||
        !VERDICTS.has(String(v.humanVerdict))
      )
        throw new Error(`評価用データの ${i + 1} 行目の形が正しくありません`);
      return v as EvalExample;
    });
}

// ---------------------------------------------------------------
// 素材を集めて要求を組み立てる
// ---------------------------------------------------------------

/** 回収したあとの判定に使う部分。手元の状態に控える (提出の本文を含む)。 */
export interface ReplayJudgeContext {
  kind: string;
  material: AiReviewJudgeMaterial;
  forced: RouteReason[];
  /** 根拠に使えるファイルと記録の行数 (`BuiltReviewPrompt.lines`)。 */
  lines: [string, number][];
}

export interface PreparedReplayItem {
  subject: ReplaySubject;
  judge: ReplayJudgeContext;
  /** 候補ごとの要求 (`candidates` と同じ並び)。 */
  requests: MessageCreateParamsNonStreaming[];
}

export interface SkippedReplayItem {
  subject: ReplaySubject;
  /** `missing` は提出の行そのものが無い (消された)。ほかは本番の AI の失敗の語彙。 */
  failure: AiFailure | "missing";
  detail: string;
}

async function prepareOne(
  deps: { db: Db; env: Env },
  subject: ReplaySubject,
  candidates: ReplayCandidate[],
): Promise<PreparedReplayItem | SkippedReplayItem> {
  const [row] = await deps.db
    .select()
    .from(submissions)
    .where(eq(submissions.id, subject.submissionId))
    .limit(1);
  if (!row) return { subject, failure: "missing", detail: "提出が見つかりません" };
  // 本番の runAiReview と同じく、教材の読み出しで落ちても判定できなかったとして扱う。
  const loaded = await loadMaterial(deps.db, deps.env, row).catch((e: unknown) => ({
    failure: "error" as const,
    detail: e instanceof Error ? e.message.slice(0, 500) : "教材を読み出せません",
  }));
  if ("failure" in loaded) return { subject, failure: loaded.failure, detail: loaded.detail };
  const built = candidates.map((candidate) => {
    const prompt = buildAiReviewPrompt(loaded.material, candidate.promptVersion);
    return { prompt, params: jsonSchemaRequestParams(aiReviewRequest(prompt, candidate.model)) };
  });
  const large = built.find((b) => b.prompt.variableChars > MAX_REVIEW_INPUT_CHARS);
  if (large)
    return { subject, failure: "too-large", detail: `${large.prompt.variableChars} chars` };
  return {
    subject,
    judge: {
      kind: row.taskKind ?? "basic",
      material: judgeMaterialOf(loaded),
      forced: await submissionForcedReasons(deps.db, row),
      lines: [...(built[0]?.prompt.lines ?? new Map<string, number>())],
    },
    requests: built.map((b) => b.params),
  };
}

/**
 * 提出ごとに素材を集め、候補ごとの要求を組み立てる。D1 と R2 は読むだけ。
 * `limit` は AI に送る提出の件数で、判定しない提出は数えない (数え終えたら読むのをやめる)。
 */
export async function prepareReplay(
  deps: { db: Db; env: Env },
  subjects: ReplaySubject[],
  candidates: ReplayCandidate[],
  opts: { limit: number | null; concurrency?: number; onProgress?: (done: number) => void } = {
    limit: null,
  },
): Promise<{ items: PreparedReplayItem[]; skipped: SkippedReplayItem[] }> {
  const items: PreparedReplayItem[] = [];
  const skipped: SkippedReplayItem[] = [];
  const width = Math.max(1, opts.concurrency ?? 4);
  for (let start = 0; start < subjects.length; start += width) {
    if (opts.limit !== null && items.length >= opts.limit) break;
    const chunk = subjects.slice(start, start + width);
    const results = await Promise.all(chunk.map((s) => prepareOne(deps, s, candidates)));
    for (const result of results) {
      if (opts.limit !== null && items.length >= opts.limit) break;
      if ("judge" in result) items.push(result);
      else skipped.push(result);
    }
    opts.onProgress?.(Math.min(start + width, subjects.length));
  }
  return { items, skipped };
}

// ---------------------------------------------------------------
// トークンと費用の目安
// ---------------------------------------------------------------

/**
 * 文字数からの入力トークンの目安。日本語は 1 文字 ≒ 1 トークン、ASCII は 3.5 文字 ≒ 1 トークンで
 * 多めに見積もる。正確な数は回収したあとの使用量 (`usage`) で出す。
 */
export function estimateTokens(text: string): number {
  let ascii = 0;
  let other = 0;
  for (const ch of text) {
    if ((ch.codePointAt(0) ?? 0) < 128) ascii++;
    else other++;
  }
  return other + Math.ceil(ascii / 3.5);
}

function blockTexts(content: unknown): string[] {
  if (typeof content === "string") return [content];
  if (!Array.isArray(content)) return [];
  return content.flatMap((block: { type?: string; text?: string }) =>
    block?.type === "text" && typeof block.text === "string" ? [block.text] : [],
  );
}

/** 1 件の要求の入力トークンの目安 (指示・規則・課題・提出・出力の形)。 */
export function estimateInputTokens(params: MessageCreateParamsNonStreaming): number {
  const texts = [
    ...blockTexts(params.system),
    ...params.messages.flatMap((m) => blockTexts(m.content)),
    JSON.stringify(params.output_config?.format ?? {}),
  ];
  return texts.reduce((sum, t) => sum + estimateTokens(t), 0);
}

/** 判定の JSON (ルーブリック・所見・返信) の出力トークンの目安。上限は要求の `max_tokens`。 */
export const ESTIMATED_OUTPUT_TOKENS = 3_000;

/** 100 万トークンあたりの米ドル (2026-09 時点の公開価格)。表に無いモデルは費用を出さない。 */
export interface ModelPrice {
  input: number;
  output: number;
  /** キャッシュの読み出し。省けば入力の 1 割。 */
  cacheRead?: number;
}
export const MODEL_PRICES: Readonly<Record<string, ModelPrice>> = {
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25 },
  "claude-fable-5": { input: 10, output: 50 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};
/** Message Batches は通常の半額。 */
export const BATCH_PRICE_FACTOR = 0.5;
/** キャッシュの書き込み (5 分) は入力の 1.25 倍。 */
const CACHE_WRITE_FACTOR = 1.25;

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

const emptyUsage = (): TokenUsage => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheReadInputTokens: 0,
  cacheCreationInputTokens: 0,
});

/** Batch で払う費用の目安 (米ドル)。価格の表に無いモデルは null。 */
export function batchCostUsd(model: string, usage: TokenUsage): number | null {
  if (!Object.hasOwn(MODEL_PRICES, model)) return null;
  const price = MODEL_PRICES[model] as ModelPrice;
  const cacheRead = price.cacheRead ?? price.input * 0.1;
  const full =
    usage.inputTokens * price.input +
    usage.cacheCreationInputTokens * price.input * CACHE_WRITE_FACTOR +
    usage.cacheReadInputTokens * cacheRead +
    usage.outputTokens * price.output;
  return (BATCH_PRICE_FACTOR * full) / 1_000_000;
}

export interface ReplayEstimate {
  candidate: ReplayCandidate;
  requests: number;
  inputTokens: number;
  /** 目安 (`ESTIMATED_OUTPUT_TOKENS` × 件数)。 */
  outputTokens: number;
  /** 上限 (`max_tokens` × 件数)。 */
  maxOutputTokens: number;
  /** キャッシュが効かないとみた目安。 */
  cost: number | null;
  /** 出力が上限まで出たときの費用。 */
  maxCost: number | null;
}

export function estimateReplay(
  items: PreparedReplayItem[],
  candidates: ReplayCandidate[],
): ReplayEstimate[] {
  return candidates.map((candidate, ci) => {
    const requests = items.flatMap((item) => (item.requests[ci] ? [item.requests[ci]] : []));
    const inputTokens = requests.reduce((sum, r) => sum + estimateInputTokens(r), 0);
    const outputTokens = requests.length * ESTIMATED_OUTPUT_TOKENS;
    const maxOutputTokens = requests.reduce((sum, r) => sum + r.max_tokens, 0);
    const cost = (output: number) =>
      batchCostUsd(candidate.model, { ...emptyUsage(), inputTokens, outputTokens: output });
    return {
      candidate,
      requests: requests.length,
      inputTokens,
      outputTokens,
      maxOutputTokens,
      cost: cost(outputTokens),
      maxCost: cost(maxOutputTokens),
    };
  });
}

const usd = (v: number | null) => (v === null ? "- (価格の表に無いモデル)" : `$${v.toFixed(2)}`);
const tokens = (v: number) => v.toLocaleString("en-US");

function skippedCounts(skipped: { failure: string }[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const s of skipped) counts.set(s.failure, (counts.get(s.failure) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function failureLabel(failure: string): string {
  if (failure === "missing") return "提出の行がありません";
  return Object.hasOwn(AI_FAILURE_LABELS, failure)
    ? AI_FAILURE_LABELS[failure as AiFailure]
    : failure;
}

function skippedTable(skipped: { failure: string }[]): string[] {
  if (skipped.length === 0) return [];
  return [
    "",
    `### 判定しない提出 (${skipped.length} 件。本番も AI を呼ばない。比べる母数から外す)`,
    "",
    "| 理由 | 件数 |",
    "| --- | ---: |",
    ...skippedCounts(skipped).map(([f, n]) => `| ${f}: ${failureLabel(f)} | ${n} |`),
  ];
}

/** dry-run の表示。API は呼ばない。 */
export function formatDryRun(input: {
  subjects: number;
  items: PreparedReplayItem[];
  skipped: SkippedReplayItem[];
  candidates: ReplayCandidate[];
  limit: number | null;
}): string {
  const estimates = estimateReplay(input.items, input.candidates);
  const totalCost = estimates.every((e) => e.cost !== null)
    ? estimates.reduce((sum, e) => sum + (e.cost ?? 0), 0)
    : null;
  const totalMax = estimates.every((e) => e.maxCost !== null)
    ? estimates.reduce((sum, e) => sum + (e.maxCost ?? 0), 0)
    : null;
  return [
    `## リプレイの見積もり (しきい値 ${AI_REVIEW_THRESHOLD_VERSION}、Message Batches で半額)`,
    "",
    `評価用データの提出 ${input.subjects} 件のうち、AI に送る提出 ${input.items.length} 件${
      input.limit === null ? "" : ` (--limit ${input.limit})`
    }、判定しない提出 ${input.skipped.length} 件${
      input.limit === null ? "" : " (上限に達するまでに読んだ範囲)"
    }。`,
    "",
    "| 候補 | 要求 | 入力トークン (目安) | 出力トークン (目安 / 上限) | 費用の目安 | 出力が上限のとき |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...estimates.map(
      (e) =>
        `| ${e.candidate.label} | ${e.requests} | ${tokens(e.inputTokens)} | ${tokens(e.outputTokens)} / ${tokens(e.maxOutputTokens)} | ${usd(e.cost)} | ${usd(e.maxCost)} |`,
    ),
    "",
    `合計の目安: ${usd(totalCost)} (出力が上限のとき ${usd(totalMax)})。入力はキャッシュが効かないとみた多めの目安。`,
    ...skippedTable(input.skipped),
  ].join("\n");
}

// ---------------------------------------------------------------
// Batch への投入と回収
// ---------------------------------------------------------------

/** 使う Message Batches の操作 (テストで差し替える)。 */
export interface BatchApi {
  create(body: {
    requests: { custom_id: string; params: MessageCreateParamsNonStreaming }[];
  }): Promise<{ id: string }>;
  retrieve(id: string): Promise<{
    id: string;
    processing_status: "in_progress" | "canceling" | "ended";
    request_counts: MessageBatchRequestCounts;
  }>;
  results(id: string): Promise<AsyncIterable<MessageBatchIndividualResponse>>;
}

/** 要求の ID は候補と提出の添字だけ (提出 ID・受講者を Batch に載せない)。 */
export function replayCustomId(candidate: number, item: number): string {
  return `c${candidate}-s${item}`;
}
function parseCustomId(id: string): { candidate: number; item: number } | null {
  const m = /^c(\d+)-s(\d+)$/.exec(id);
  return m ? { candidate: Number(m[1]), item: Number(m[2]) } : null;
}

/** 1 つの Batch の上限 (10 万件・256MB) より小さく分ける。 */
export function chunkBatchRequests<T>(
  requests: T[],
  limits: { maxRequests: number; maxBytes: number } = {
    maxRequests: 10_000,
    maxBytes: 100_000_000,
  },
): T[][] {
  const chunks: T[][] = [];
  let current: T[] = [];
  let bytes = 0;
  for (const request of requests) {
    const size = Buffer.byteLength(JSON.stringify(request));
    if (
      current.length > 0 &&
      (current.length >= limits.maxRequests || bytes + size > limits.maxBytes)
    ) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }
    current.push(request);
    bytes += size;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

export const REPLAY_STATE_VERSION = 1;

/** 投入したあとに手元に残す状態 (提出の本文を含む。gitignore された置き場所に書く)。 */
export interface ReplayState {
  version: typeof REPLAY_STATE_VERSION;
  createdAt: string;
  /** 評価用データの出どころ (`remote` / `local` / JSONL のファイル名)。 */
  source: string;
  /** 投入したときのしきい値の版 (判定は回収したときのコードで当てる)。 */
  thresholdVersion: string;
  candidates: ReplayCandidate[];
  batchIds: string[];
  items: { subject: ReplaySubject; judge: ReplayJudgeContext }[];
  skipped: { subject: ReplaySubject; failure: string; detail: string }[];
}

/** 要求を Batch に投入し、回収に要る状態を返す。 */
export async function submitReplay(
  api: BatchApi,
  prepared: { items: PreparedReplayItem[]; skipped: SkippedReplayItem[] },
  candidates: ReplayCandidate[],
  meta: { createdAt: string; source: string },
): Promise<ReplayState> {
  const requests = prepared.items.flatMap((item, si) =>
    item.requests.map((params, ci) => ({ custom_id: replayCustomId(ci, si), params })),
  );
  const batchIds: string[] = [];
  for (const chunk of chunkBatchRequests(requests)) {
    const batch = await api.create({ requests: chunk });
    batchIds.push(batch.id);
  }
  return {
    version: REPLAY_STATE_VERSION,
    createdAt: meta.createdAt,
    source: meta.source,
    thresholdVersion: AI_REVIEW_THRESHOLD_VERSION,
    candidates,
    batchIds,
    items: prepared.items.map(({ subject, judge }) => ({ subject, judge })),
    skipped: prepared.skipped,
  };
}

/** 候補 1 つの、提出 1 件の結果。 */
export interface ReplayOutcome {
  /** null は呼び出しの失敗 (候補の判定ではないので比べる母数から外す)。 */
  decision: ReplayDecision | null;
  /** 呼び出しの失敗 (`errored:<種類>`・`expired`・`canceled`・`missing`)。 */
  callError: string | null;
  usage: TokenUsage | null;
}

export interface ReplayRow {
  submissionId: string;
  taskId: string;
  taskKind: string;
  humanVerdict: EvalExample["humanVerdict"];
  production: ReplayDecision;
  candidates: ReplayOutcome[];
}

/** Batch の 1 件の結果を、本番と同じ関数で読んで判定する。 */
export function judgeBatchResult(
  judge: ReplayJudgeContext,
  result: MessageBatchIndividualResponse["result"] | undefined,
): ReplayOutcome {
  if (!result) return { decision: null, callError: "missing", usage: null };
  if (result.type !== "succeeded") {
    const kind =
      result.type === "errored" ? `errored:${result.error?.error?.type ?? "unknown"}` : result.type;
    return { decision: null, callError: kind, usage: null };
  }
  const completion = readJsonSchemaCompletion(result.message);
  const call = interpretAiCompletion(completion);
  const output = call.ok ? call.output : null;
  const { decision } = judgeAiReview({
    kind: judge.kind,
    material: judge.material,
    forced: judge.forced,
    output,
    lines: new Map(judge.lines),
  });
  return {
    decision: {
      outcome: decision.outcome,
      routeReasons: decision.reasons,
      confidence: decision.confidence,
      proposedVerdict: decision.proposedVerdict,
      failure: call.ok ? null : call.failure,
    },
    callError: null,
    usage: {
      inputTokens: completion.usage.inputTokens,
      outputTokens: completion.usage.outputTokens,
      cacheReadInputTokens: completion.usage.cacheReadInputTokens ?? 0,
      cacheCreationInputTokens: completion.usage.cacheCreationInputTokens ?? 0,
    },
  };
}

export type ReplayCollect =
  | {
      status: "pending";
      batches: { id: string; status: string; counts: MessageBatchRequestCounts }[];
    }
  | { status: "ended"; report: ReplayReport };

/** 投入した Batch を回収する。終わっていなければ進み具合だけを返す。 */
export async function collectReplay(api: BatchApi, state: ReplayState): Promise<ReplayCollect> {
  if (state.version !== REPLAY_STATE_VERSION)
    throw new Error(`状態の版 ${state.version} は読めません`);
  const batches = await Promise.all(state.batchIds.map((id) => api.retrieve(id)));
  if (batches.some((b) => b.processing_status !== "ended"))
    return {
      status: "pending",
      batches: batches.map((b) => ({
        id: b.id,
        status: b.processing_status,
        counts: b.request_counts,
      })),
    };
  const results = new Map<string, MessageBatchIndividualResponse["result"]>();
  for (const id of state.batchIds)
    for await (const entry of await api.results(id)) {
      if (parseCustomId(entry.custom_id)) results.set(entry.custom_id, entry.result);
    }
  const rows: ReplayRow[] = state.items.map(({ subject, judge }, si) => ({
    submissionId: subject.submissionId,
    taskId: subject.taskId,
    taskKind: subject.taskKind,
    humanVerdict: subject.humanVerdict,
    production: subject.production,
    candidates: state.candidates.map((_, ci) =>
      judgeBatchResult(judge, results.get(replayCustomId(ci, si))),
    ),
  }));
  return { status: "ended", report: buildReplayReport(state, rows) };
}

// ---------------------------------------------------------------
// 比べる数字
// ---------------------------------------------------------------

export interface ReplaySummary {
  label: string;
  model: string;
  promptVersion: string;
  thresholdVersion: string;
  /** 比べた提出 (呼び出しの失敗を除く)。 */
  examples: number;
  /** 呼び出しの失敗 (Batch の errored・expired など)。母数から外す。 */
  callErrors: number;
  /** 判定案 (合格か再提出か) を出せた件数。 */
  judged: number;
  /** 判定案が人の判定 (合格か否か) と一致した割合。 */
  agreement: number | null;
  confirmed: number;
  /** AI で確定にした割合。 */
  confirmedRate: number | null;
  /** AI で確定にしたうち、人が再提出・不合格にした件数 (危ない取りこぼし)。 */
  riskyConfirmed: number;
  riskyConfirmedRate: number | null;
  /** AI が判定できなかった件数 (拒否・形の誤りなど。人に回る)。 */
  aiFailures: number;
  /** 人に回した理由ごとの件数と、そのうち人が合格にした件数。 */
  reasons: Record<string, { escalated: number; humanPassed: number }>;
  /** 練習の「中」で AI で確定にしたうち、人が覆した割合 (§6.3 の見直しの目安。> 1 割)。 */
  practiceMediumOverturned: number | null;
  /** 人に回したうち、人がそのまま合格にした割合 (> 8 割は条件が厳しすぎる)。 */
  escalatedHumanPassed: number | null;
  escalatedHumanPassedByKind: Record<string, { escalated: number; humanPassed: number }>;
  /** 人に回した割合が 3 割を超えた課題 (AI より先に課題文とルーブリックを疑う)。 */
  tasksOverEscalation: { taskId: string; reviewed: number; escalated: number; rate: number }[];
  usage: TokenUsage | null;
  /** Batch で払った費用の目安 (米ドル)。 */
  cost: number | null;
}

interface SummaryRow {
  taskId: string;
  taskKind: string;
  humanVerdict: string;
  decision: ReplayDecision | null;
  usage: TokenUsage | null;
}

const bump = (
  map: Record<string, { escalated: number; humanPassed: number }>,
  key: string,
  passed: boolean,
) => {
  const entry = map[key] ?? { escalated: 0, humanPassed: 0 };
  entry.escalated++;
  if (passed) entry.humanPassed++;
  map[key] = entry;
};

export function summarizeReplay(
  meta: { label: string; model: string; promptVersion: string; thresholdVersion: string },
  rows: SummaryRow[],
  priceModel: string | null,
): ReplaySummary {
  const compared = rows.filter(
    (r): r is SummaryRow & { decision: ReplayDecision } => r.decision !== null,
  );
  const passed = (r: { humanVerdict: string }) => r.humanVerdict === "pass";
  const judged = compared.filter((r) => r.decision.proposedVerdict !== null);
  const agreed = judged.filter((r) => (r.decision.proposedVerdict === "pass") === passed(r));
  const confirmed = compared.filter((r) => r.decision.outcome === "confirmed");
  const risky = confirmed.filter((r) => !passed(r));
  const practiceMedium = confirmed.filter(
    (r) => !isEvidenceKind(r.taskKind) && r.decision.confidence === "medium",
  );
  const escalated = compared.filter((r) => r.decision.outcome === "escalated");
  const reasons: ReplaySummary["reasons"] = {};
  const byKind: ReplaySummary["escalatedHumanPassedByKind"] = {};
  for (const r of escalated) {
    for (const reason of r.decision.routeReasons) bump(reasons, reason, passed(r));
    bump(byKind, r.taskKind, passed(r));
  }
  const byTask = new Map<string, { reviewed: number; escalated: number }>();
  for (const r of compared) {
    const entry = byTask.get(r.taskId) ?? { reviewed: 0, escalated: 0 };
    entry.reviewed++;
    if (r.decision.outcome === "escalated") entry.escalated++;
    byTask.set(r.taskId, entry);
  }
  const usages = rows.flatMap((r) => (r.usage ? [r.usage] : []));
  const usage =
    usages.length === 0
      ? null
      : usages.reduce(
          (sum, u) => ({
            inputTokens: sum.inputTokens + u.inputTokens,
            outputTokens: sum.outputTokens + u.outputTokens,
            cacheReadInputTokens: sum.cacheReadInputTokens + u.cacheReadInputTokens,
            cacheCreationInputTokens: sum.cacheCreationInputTokens + u.cacheCreationInputTokens,
          }),
          emptyUsage(),
        );
  return {
    ...meta,
    examples: compared.length,
    callErrors: rows.length - compared.length,
    judged: judged.length,
    agreement: ratio(agreed.length, judged.length),
    confirmed: confirmed.length,
    confirmedRate: ratio(confirmed.length, compared.length),
    riskyConfirmed: risky.length,
    riskyConfirmedRate: ratio(risky.length, confirmed.length),
    aiFailures: compared.filter((r) => r.decision.failure !== null).length,
    reasons,
    practiceMediumOverturned: ratio(
      practiceMedium.filter((r) => !passed(r)).length,
      practiceMedium.length,
    ),
    escalatedHumanPassed: ratio(escalated.filter(passed).length, escalated.length),
    escalatedHumanPassedByKind: byKind,
    tasksOverEscalation: [...byTask.entries()]
      .map(([taskId, t]) => ({ taskId, ...t, rate: t.escalated / t.reviewed }))
      .filter((t) => exceedsAlert(t.rate, REVIEW_METRIC_ALERTS.taskEscalated))
      .sort((a, b) => b.rate - a.rate || a.taskId.localeCompare(b.taskId)),
    usage,
    cost: usage && priceModel ? batchCostUsd(priceModel, usage) : null,
  };
}

export interface ReplayReport {
  createdAt: string;
  collectedAt: string;
  source: string;
  /** 判定に当てたしきい値の版 (回収したときのコード)。 */
  thresholdVersion: string;
  candidates: ReplayCandidate[];
  /** 当て直した提出の件数 (判定しない提出を除く)。 */
  submissions: number;
  skipped: { submissionId: string; taskId: string; failure: string; detail: string }[];
  /** 先頭は本番の記録 (同じ提出に本番が記録した最新の AI の結果)、続いて候補の順。 */
  summaries: ReplaySummary[];
  rows: ReplayRow[];
}

const distinct = (values: (string | null)[]) =>
  [...new Set(values.map((v) => v ?? "(なし)"))].join(", ") || "-";

export function buildReplayReport(
  state: ReplayState,
  rows: ReplayRow[],
  collectedAt = new Date().toISOString(),
): ReplayReport {
  const production = summarizeReplay(
    {
      label: "本番の記録",
      model: distinct(state.items.map((i) => i.subject.production.model)),
      promptVersion: distinct(state.items.map((i) => i.subject.production.promptVersion)),
      thresholdVersion: distinct(state.items.map((i) => i.subject.production.thresholdVersion)),
    },
    rows.map((r) => ({ ...r, decision: r.production, usage: null })),
    null,
  );
  const candidates = state.candidates.map((candidate, ci) =>
    summarizeReplay(
      {
        label: candidate.label,
        model: candidate.model,
        promptVersion: candidate.promptVersion,
        thresholdVersion: AI_REVIEW_THRESHOLD_VERSION,
      },
      rows.map((r) => ({
        ...r,
        decision: r.candidates[ci]?.decision ?? null,
        usage: r.candidates[ci]?.usage ?? null,
      })),
      candidate.model,
    ),
  );
  return {
    createdAt: state.createdAt,
    collectedAt,
    source: state.source,
    thresholdVersion: AI_REVIEW_THRESHOLD_VERSION,
    candidates: state.candidates,
    submissions: rows.length,
    skipped: state.skipped.map((s) => ({
      submissionId: s.subject.submissionId,
      taskId: s.subject.taskId,
      failure: s.failure,
      detail: s.detail,
    })),
    summaries: [production, ...candidates],
    rows,
  };
}

const percent = (v: number | null) => (v === null ? "-" : `${(v * 100).toFixed(1)}%`);
/** 見直しの境目 (§6.3) を超えた割合は太字にする。 */
const flagged = (v: number | null, limit: number) =>
  exceedsAlert(v, limit) ? `**${percent(v)}**` : percent(v);

/** 結果の表 (Markdown)。 */
export function formatReplayReport(report: ReplayReport): string {
  const s = report.summaries;
  const reasonKeys = [
    ...ROUTE_REASONS.filter((r) => s.some((x) => x.reasons[r])),
    ...[...new Set(s.flatMap((x) => Object.keys(x.reasons)))].filter(
      (r) => !(ROUTE_REASONS as readonly string[]).includes(r),
    ),
  ];
  const reasonLabel = (r: string) =>
    Object.hasOwn(ROUTE_REASON_LABELS, r) ? ROUTE_REASON_LABELS[r as RouteReason] : r;
  return [
    `## リプレイの結果 (提出 ${report.submissions} 件、しきい値 ${report.thresholdVersion})`,
    "",
    "比べる数字は、人がレビューした提出に候補を当て直した判定と人の判定の突き合わせ。",
    "危ない取りこぼし = AI で確定にしたうち人が再提出・不合格にしたもの。太字は §6.3 の見直しの境目を超えた値。",
    "",
    "| 候補 | モデル | 指示 | 件数 | 呼び出しの失敗 | 判定案 | 一致率 | AI で確定 | 危ない取りこぼし | AI 判定不能 | 練習・中を覆した | 人に回して合格 | 人に回す割合 3 割超の課題 | 入力 / キャッシュ読み / 出力トークン | 費用 (Batch) |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...s.map((x) => {
      const used = x.usage
        ? `${tokens(x.usage.inputTokens + x.usage.cacheCreationInputTokens)} / ${tokens(x.usage.cacheReadInputTokens)} / ${tokens(x.usage.outputTokens)}`
        : "-";
      return `| ${x.label} | ${x.model} | ${x.promptVersion} | ${x.examples} | ${x.callErrors} | ${x.judged} | ${percent(x.agreement)} | ${percent(x.confirmedRate)} (${x.confirmed}) | ${percent(x.riskyConfirmedRate)} (${x.riskyConfirmed}) | ${x.aiFailures} | ${flagged(x.practiceMediumOverturned, REVIEW_METRIC_ALERTS.practiceMediumOverturned)} | ${flagged(x.escalatedHumanPassed, REVIEW_METRIC_ALERTS.escalatedPassedAsIs)} | ${x.tasksOverEscalation.length} | ${used} | ${x.cost === null ? "-" : `$${x.cost.toFixed(2)}`} |`;
    }),
    "",
    "### 人に回した理由の内訳 (件数。括弧は人がそのまま合格にした件数)",
    "",
    `| 理由 | ${s.map((x) => x.label).join(" | ")} |`,
    `| --- | ${s.map(() => "---:").join(" | ")} |`,
    ...reasonKeys.map(
      (r) =>
        `| ${reasonLabel(r)} | ${s
          .map((x) => {
            const e = x.reasons[r];
            return e ? `${e.escalated} (${e.humanPassed})` : "0";
          })
          .join(" | ")} |`,
    ),
    ...skippedTable(report.skipped),
  ].join("\n");
}

// ---------------------------------------------------------------
// コマンド (CLI から呼ぶ。テストで差し替えられるよう依存を受け取る)
// ---------------------------------------------------------------

/**
 * 見積もりを出し、`--run` のときだけ Batch に投入する。既定は dry-run で、API の操作
 * (`batchApi`) を作りもしない。投入したら回収に要る状態を保存して返す。
 */
export async function replayPrepareCommand(
  args: Extract<ReplayArgs, { mode: "prepare" }>,
  deps: {
    bindings: { db: Db; env: Env };
    examples: EvalExample[];
    batchApi: () => BatchApi;
    /** 状態を保存し、回収のときに渡す置き場所を返す。 */
    saveState: (state: ReplayState) => string;
    log: (text: string) => void;
    onProgress?: (done: number, total: number) => void;
    now?: () => Date;
  },
): Promise<ReplayState | null> {
  // 引数の読み取りでも止めているが、上限なしで API を呼ぶ経路をここでも作らない。
  if (args.run && args.limit === null) throw new Error("--run には --limit が要ります");
  const subjects = subjectsOf(deps.examples);
  const prepared = await prepareReplay(deps.bindings, subjects, args.candidates, {
    limit: args.limit,
    onProgress: (done) => deps.onProgress?.(done, subjects.length),
  });
  deps.log(
    formatDryRun({
      subjects: subjects.length,
      items: prepared.items,
      skipped: prepared.skipped,
      candidates: args.candidates,
      limit: args.limit,
    }),
  );
  if (!args.run) {
    deps.log(
      "\nAPI は呼んでいません (dry-run)。Batch に投入するには --run --limit <件数> を付けてください。",
    );
    return null;
  }
  if (prepared.items.length === 0) {
    deps.log("\nAI に送る提出がありません。投入しません。");
    return null;
  }
  const state = await submitReplay(deps.batchApi(), prepared, args.candidates, {
    createdAt: (deps.now?.() ?? new Date()).toISOString(),
    source: args.data ?? (args.remote ? "remote" : "local"),
  });
  const place = deps.saveState(state);
  deps.log(`\nBatch に投入しました: ${state.batchIds.join(", ")}`);
  deps.log(`回収: bun run --filter=@stella/api ai-review:replay -- --collect ${place}`);
  return state;
}
