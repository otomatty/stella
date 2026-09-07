/**
 * Workers AI を REST API で呼ぶ薄いクライアント (面談対策の音声機能用)。
 *
 * `[ai]` バインディングを使わないのは、 バインディングがあると `wrangler dev` が
 * 非対話環境 (CI / クラウド開発環境) で Cloudflare 認証のリモートプロキシを張ろうと
 * して起動自体に失敗するため。 REST ならトークン未設定でも API は普通に起動し、
 * 音声エンドポイントだけが 503 を返す。
 *
 * 経路 (Issue #204):
 *   - `AI_GATEWAY_ID` + `AI_GATEWAY_CF_API_TOKEN` があれば **AI Gateway 経由**
 *     (`workers-ai-audio.ts` の共通トランスポート)。 音声も Gateway のログ・使用量に載る。
 *   - 未設定なら直叩き REST にフォールバック (`WORKERS_AI_API_TOKEN`)。
 *     ローカル / CI で Gateway なしでも全機能が動くようにするため。
 */

import { DEFAULT_INTERVIEW_TTS_MODEL_ID } from "@stella/shared/interview/audio";

import type { Env } from "../env.js";
import { resolveUnifiedBillingGrokModel } from "./ai-gateway.js";
import { ApiError } from "./authz.js";
import { runModelViaGateway } from "./workers-ai-audio.js";

const API_BASE = "https://api.cloudflare.com/client/v4/accounts";

/**
 * 既定の読み上げモデルは **Grok TTS (xAI)**。
 *
 * Workers AI 側の TTS には日本語で使えるものが無い:
 *   - `@cf/myshell-ai/melotts` … 非英語は `8002 Invalid input`、 CJK は音声が返っても
 *     意味不明 (cloudflare/cloudflare-docs#23308 とコミュニティ報告)
 *   - `@cf/deepgram/aura-1` … 話者が英語話者のみで言語指定なし
 *   - `@cf/deepgram/aura-2-en` / `-es` … モデル ID のとおり英語 / スペイン語専用
 *
 * Grok TTS は AI Gateway の Unified Billing で呼べ (プロバイダの API キー不要)、
 * 日本語を含む 20 言語に対応する。 チャット / 添削の Grok と請求もログも同じ経路に乗る。
 * `INTERVIEW_TTS_MODEL` で他モデルへ差し替えでき、 入力スキーマは
 * `buildTtsInput()` がモデルごとに組み立てる。
 */
const DEFAULT_TTS_MODEL = DEFAULT_INTERVIEW_TTS_MODEL_ID;
const DEFAULT_TTS_VOICE = "eve";
const STT_MODEL = "@cf/openai/whisper-large-v3-turbo";

/**
 * **読み上げ (TTS)** 1 回の呼び出しを待つ上限。
 *
 * 読み上げは質問ごとの排他ロック (`lib/resource-lock.ts`) の中で走るので、 ここが
 * 青天井だと「ロックの保持時間が work の所要時間を上回る」という前提が崩れ、
 * 期限切れで別のリクエストが同じロックを取れてしまう。 上限を決めて、 ロックの
 * TTL をそれより長く取れるようにする。
 *
 * **文字起こしには掛けない**。 こちらはロックの外で走るうえ、 受け付ける録音は
 * 10 分超になりうる (`MAX_RECORDING_BYTES`) ので、 同じ上限だと正当な録音を
 * 途中で切ってしまう。
 */
export const AI_REQUEST_TIMEOUT_MS = 25_000;

/** 読み上げ 1 回の残り時間。 Gateway 応答と署名付き URL の取得で予算を分けない。 */
export function remainingAiRequestTimeoutMs(startedAtMs: number, nowMs = Date.now()): number {
  return Math.max(0, AI_REQUEST_TIMEOUT_MS - (nowMs - startedAtMs));
}

function ttsModel(env: Env, override?: string): string {
  const configured = override?.trim() || env.INTERVIEW_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL;
  // grok-tts → xai/grok-tts (Unified Billing のプロバイダ ID。 チャットと同じ規則)
  return resolveUnifiedBillingGrokModel(configured);
}

/**
 * env の声は、解決したモデルが env 既定と同じ入力系統のときだけ使う。
 * Grok の eve / OpenAI の nova / Aura の thalia を別系統へ載せない。
 */
function ttsVoiceFamily(model: string): "grok" | "openai" | "deepgram" | "other" {
  if (model.includes("grok-tts")) return "grok";
  if (model.includes("tts-1") || model.includes("gpt-4o-mini-tts")) return "openai";
  if (model.includes("aura")) return "deepgram";
  return "other";
}

function ttsVoice(env: Env, resolvedModel: string): string | undefined {
  if (ttsVoiceFamily(ttsModel(env)) !== ttsVoiceFamily(resolvedModel)) return undefined;
  return env.INTERVIEW_TTS_VOICE?.trim();
}

/**
 * モデルごとに読み上げリクエストの入力を組み立てる。
 * `INTERVIEW_TTS_MODEL` を差し替えても、 MeloTTS 用の `{prompt, lang}` を
 * そのまま送って 4xx になることがないようにする。
 */
export function buildTtsInput(
  model: string,
  text: string,
  lang: string,
  voice?: string,
): Record<string, unknown> {
  // Grok TTS (xAI): text + voice_id + BCP-47 の language ("auto" で自動判定)
  if (model.includes("grok-tts")) {
    return { text, voice_id: voice || DEFAULT_TTS_VOICE, language: lang };
  }
  // OpenAI TTS (tts-1 / tts-1-hd): OpenAI 形式は本文が `input`
  if (model.includes("tts-1") || model.includes("gpt-4o-mini-tts")) {
    return { input: text, voice: voice || "alloy" };
  }
  // Deepgram Aura: text + speaker (言語はモデル ID 側で決まる)
  if (model.includes("aura")) {
    return { text, ...(voice ? { speaker: voice } : {}) };
  }
  // MeloTTS ほか Workers AI 既定形
  return { prompt: text, lang };
}

/** Gateway 経由で呼べる構成か (アカウント ID + Gateway ID + Gateway 用トークン)。 */
function gatewayConfigured(env: Env): boolean {
  return Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.AI_GATEWAY_ID && env.AI_GATEWAY_CF_API_TOKEN);
}

export function workersAiConfigured(env: Env): boolean {
  if (!env.CLOUDFLARE_ACCOUNT_ID) return false;
  return gatewayConfigured(env) || Boolean(env.WORKERS_AI_API_TOKEN);
}

function requireConfig(env: Env): { token: string; accountId: string } {
  const token = env.WORKERS_AI_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) {
    throw new ApiError(
      "音声機能は未設定です (WORKERS_AI_API_TOKEN / CLOUDFLARE_ACCOUNT_ID を設定してください)",
      503,
    );
  }
  return { token, accountId };
}

function bytesToBase64(bytes: Uint8Array): string {
  // String.fromCharCode の引数上限を避けてチャンクで組み立てる。
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Unified Billing (第三者プロバイダ) のモデルか。 `xai/grok-tts` のように
 * `provider/model` 形式で、 Workers AI 自前モデルの `@cf/` 接頭辞を持たないもの。
 * これらは AI Gateway 経由でしか呼べない (直叩き `/ai/run/` には存在しない)。
 */
function isUnifiedBillingModel(model: string): boolean {
  return model.includes("/") && !model.startsWith("@cf/");
}

/**
 * モデルを 1 回実行する。 Gateway が構成されていれば Gateway 経由 (モデル名は body)、
 * 未構成なら直叩き REST (モデル名は URL) にフォールバックする。
 */
async function runModel(
  env: Env,
  model: string,
  input: Record<string, unknown>,
  /** 応答を待つ上限 (ms)。 未指定なら待ち続ける (長い録音の文字起こし用)。 */
  timeoutMs?: number,
  /**
   * 上流本文を ApiError に載せるか。 読み上げ生成 (admin) だけ true。
   * 文字起こしは受講者も叩くので本文はサーバログに限定する。
   */
  includeUpstreamBody = false,
): Promise<Response> {
  if (!gatewayConfigured(env) && isUnifiedBillingModel(model)) {
    // 直叩きへ落とすと `/ai/run/xai%2Fgrok-tts` で 404 になり原因が分かりにくいので、
    // 設定不足として明示的に落とす。
    throw new ApiError(
      `音声機能は未設定です (${model} は AI Gateway 経由でのみ利用でき、 CLOUDFLARE_ACCOUNT_ID / AI_GATEWAY_ID / AI_GATEWAY_CF_API_TOKEN が必要です)`,
      503,
    );
  }
  const signal = timeoutMs === undefined ? undefined : AbortSignal.timeout(timeoutMs);
  const res = gatewayConfigured(env)
    ? await runModelViaGateway({
        env: {
          // gatewayConfigured() で存在は確認済み。
          CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID as string,
          AI_GATEWAY_ID: env.AI_GATEWAY_ID as string,
          AI_GATEWAY_CF_API_TOKEN: env.AI_GATEWAY_CF_API_TOKEN as string,
        },
        model,
        input,
        ...(signal ? { signal } : {}),
      })
    : await (async () => {
        const { token, accountId } = requireConfig(env);
        return fetch(`${API_BASE}/${accountId}/ai/run/${model}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(input),
          ...(signal ? { signal } : {}),
        });
      })();

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[workers-ai] ${model} failed (${res.status}): ${text.slice(0, 300)}`);
    throw new ApiError(formatWorkersAiHttpError(model, res.status, text, includeUpstreamBody), 502);
  }
  return res;
}

/** 上流の失敗本文をクライアントへ返せる長さに切り詰める。 */
const UPSTREAM_SNIPPET = 240;

export function formatWorkersAiHttpError(
  model: string,
  status: number,
  body: string,
  includeUpstreamBody = false,
): string {
  const detail = body.replace(/\s+/g, " ").trim().slice(0, UPSTREAM_SNIPPET);
  return includeUpstreamBody && detail
    ? `${model}: Workers AI の呼び出しに失敗しました (${status}): ${detail}`
    : `${model}: Workers AI の呼び出しに失敗しました (${status})`;
}

/** JSON 応答のキーだけを残す (audio の base64 は載せない)。 */
export function jsonResponseShape(data: unknown): string {
  if (data === null || typeof data !== "object") return `value=${typeof data}`;
  const keys = Object.keys(data);
  const result = (data as { result?: unknown }).result;
  if (result !== null && typeof result === "object") {
    return `keys=[${keys.join(",")}] result.keys=[${Object.keys(result).join(",")}]`;
  }
  return `keys=[${keys.join(",")}]`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

/**
 * `/ai/run` の TTS 応答から audio を拾う。
 *
 * Grok TTS (Unified Billing) は Cloudflare 封筒
 * `{ result: { state, result: { audio }, gatewayMetadata } }` で、 audio は
 * 署名付き URL。 直叩き / 旧形は `{ result: { audio: base64 } }` や `{ audio }`。
 */
function ttsAudioField(data: unknown): string | undefined {
  const top = asRecord(data);
  if (!top) return undefined;
  if (typeof top.audio === "string" && top.audio.length > 0) return top.audio;
  const mid = asRecord(top.result);
  if (!mid) return undefined;
  if (typeof mid.audio === "string" && mid.audio.length > 0) return mid.audio;
  const inner = asRecord(mid.result);
  if (typeof inner?.audio === "string" && inner.audio.length > 0) return inner.audio;
  return undefined;
}

async function bytesFromTtsAudioField(audio: string, timeoutMs?: number): Promise<Uint8Array> {
  if (audio.startsWith("http://") || audio.startsWith("https://")) {
    if (!audio.startsWith("https://")) {
      throw new ApiError("音声 URL は https のみ受け付けます", 502);
    }
    const signal = timeoutMs === undefined ? undefined : AbortSignal.timeout(timeoutMs);
    const res = await fetch(audio, signal ? { signal } : {});
    if (!res.ok) {
      throw new ApiError(`音声ファイルの取得に失敗しました (${res.status})`, 502);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0) {
      throw new ApiError("音声ファイルの取得結果が空でした", 502);
    }
    return bytes;
  }
  return base64ToBytes(audio);
}

/**
 * 質問文を読み上げモデル (既定 Grok TTS) で音声に合成する。
 * `includeUpstreamBody` は admin の一括生成だけ true。 質問 PATCH (sales 可) は既定の false。
 */
export async function synthesizeSpeech(
  env: Env,
  text: string,
  lang: string,
  includeUpstreamBody = false,
  modelId?: string,
): Promise<Uint8Array> {
  const model = ttsModel(env, modelId);
  const voice = ttsVoice(env, model);
  const startedAt = Date.now();
  const res = await runModel(
    env,
    model,
    buildTtsInput(model, text, lang, voice),
    AI_REQUEST_TIMEOUT_MS,
    includeUpstreamBody,
  );
  const contentType = res.headers.get("content-type") ?? "";
  // Grok TTS は JSON 封筒 + 署名付き URL。 Workers AI 自前 TTS は base64 かバイナリ。
  if (contentType.includes("application/json")) {
    const data: unknown = await res.json();
    const audio = ttsAudioField(data);
    if (!audio) {
      throw new ApiError(`${model}: 音声の生成結果が空でした (${jsonResponseShape(data)})`, 502);
    }
    const remaining = remainingAiRequestTimeoutMs(startedAt);
    if (remaining <= 0) {
      throw new ApiError(`${model}: 音声の生成が時間切れになりました`, 502);
    }
    return bytesFromTtsAudioField(audio, remaining);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length === 0) {
    throw new ApiError(`${model}: 音声の生成結果が空でした (binary, 0 bytes)`, 502);
  }
  return bytes;
}

export interface TranscriptionResult {
  text: string;
  durationSec: number | null;
}

/** 録音 (webm/opus, mp4 など) を Whisper large-v3-turbo で日本語文字起こしする。 */
export async function transcribeAudio(
  env: Env,
  audio: Uint8Array,
  opts: { initialPrompt?: string } = {},
): Promise<TranscriptionResult> {
  const res = await runModel(env, STT_MODEL, {
    audio: bytesToBase64(audio),
    task: "transcribe",
    language: "ja",
    // 無音区間の幻聴 (ハルシネーション) 抑制。
    vad_filter: true,
    ...(opts.initialPrompt ? { initial_prompt: opts.initialPrompt } : {}),
  });
  // 直叩きは { result: {...} }、 Gateway 経由は素の { text, ... } を返すことがある。
  const data = (await res.json()) as {
    text?: string;
    transcription_info?: { duration?: number };
    result?: { text?: string; transcription_info?: { duration?: number } };
  };
  return {
    text: (data.result?.text ?? data.text ?? "").trim(),
    durationSec:
      data.result?.transcription_info?.duration ?? data.transcription_info?.duration ?? null,
  };
}
