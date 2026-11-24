/**
 * 教材動画の読み上げ (設計書の ② 読み上げ)。プロバイダの単位 (字幕 / トピック) ごとに呼ぶ。
 *
 * プロバイダ:
 * - gemini    … Gemini 3.8 Flash TTS (本番用。video:sync --remote の既定)。GEMINI_API_KEY
 * - grok      … xAI Grok TTS を Cloudflare AI Gateway (Unified Billing) 経由で。面談対策と同じ経路
 *               (apps/api/src/lib/workers-ai.ts)。CLOUDFLARE_ACCOUNT_ID / AI_GATEWAY_ID /
 *               AI_GATEWAY_CF_API_TOKEN
 * - openjtalk … ローカルの既定。準備は video:tts:setup。
 *               鍵なしで本物の日本語音声を出す開発用。声質は機械的
 * - fake      … 推定長の小さな音 (鍵も Python も要らない。描画・同期・配信の確認用)
 *
 * 生の出力をローカルにキャッシュする (キー = プロバイダの識別子 + 読み上げ文)。
 * 読み上げ文を直すと、その合成単位の音声だけを作り直す。
 */

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, posix, win32 } from "node:path";
import { fileURLToPath } from "node:url";

import { estimateSpeechSeconds } from "../../src/narration.js";

export type TtsProviderName = "gemini" | "grok" | "openjtalk" | "fake";

export function logVideoTts(provider: TtsProviderName): void {
  const note = provider === "openjtalk" ? " (ローカルの合成音声。本番の声は --tts gemini)" : "";
  console.log(`読み上げ: ${provider}${note}`);
}

export interface VoiceConfig {
  provider: TtsProviderName;
  model?: string;
  voice?: string;
  /** 話し方の指示 (gemini の speech_metadata.style)。 */
  style?: string;
  lang?: string;
  /** openjtalk の話速 (1.0 = 標準)。 */
  speed?: number;
}

export interface TtsAudio {
  bytes: Uint8Array;
  ext: "wav" | "mp3";
}

export interface TtsProvider {
  readonly unit: "cue" | "topic";
  /** キャッシュキーに入る識別子。声・モデル・style が変われば変わる (= 全字幕を作り直す)。 */
  readonly identity: string;
  /** 同時に投げてよい数。 */
  readonly concurrency: number;
  /** 呼ぶたびに結果が揺れうるか (異常長のときに 1 回だけ作り直す価値があるか)。 */
  readonly nondeterministic: boolean;
  synthesize(speech: string): Promise<TtsAudio>;
}

// ---------------------------------------------------------------- 共通

/** 再試行してよい失敗 (回数制限・一時的な障害・通信)。 */
export class RetryableError extends Error {
  constructor(
    message: string,
    readonly retryAfterSec?: number,
  ) {
    super(message);
  }
}

/** 日次上限や残高切れで、今回の実行では API を呼び直さない失敗。 */
export class QuotaExhaustedError extends Error {}

/** Google API の割り当てエラーから、再試行の判断とログに必要な情報だけを拾う。 */
export function parseQuotaError(body: string): {
  daily: boolean;
  retryAfterSec?: number;
  description: string;
} {
  const fallback = { daily: false, description: body.slice(0, 200) };
  const record = (value: unknown): Record<string, unknown> | undefined =>
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return fallback;
  }
  const error = record(record(data)?.error);
  if (!error) return fallback;
  let daily = false;
  let retryAfterSec: number | undefined;
  const quotas: string[] = [];
  for (const item of Array.isArray(error.details) ? error.details : []) {
    const detail = record(item);
    if (detail?.["@type"] === "type.googleapis.com/google.rpc.QuotaFailure") {
      for (const item of Array.isArray(detail.violations) ? detail.violations : []) {
        const violation = record(item);
        const id = typeof violation?.quotaId === "string" ? violation.quotaId : "";
        const metric = typeof violation?.quotaMetric === "string" ? violation.quotaMetric : "";
        daily ||= /perday/i.test(id) || /per_day/i.test(metric);
        if (id) {
          const value = violation?.quotaValue;
          quotas.push(
            typeof value === "string" || typeof value === "number" ? `${id}=${value}` : id,
          );
        }
      }
    }
    if (
      detail?.["@type"] === "type.googleapis.com/google.rpc.RetryInfo" &&
      typeof detail.retryDelay === "string" &&
      /^\d+(?:\.\d+)?s$/.test(detail.retryDelay)
    ) {
      const seconds = Number(detail.retryDelay.slice(0, -1));
      if (Number.isFinite(seconds)) retryAfterSec = seconds;
    }
  }
  return {
    daily,
    retryAfterSec,
    description:
      quotas.length > 0
        ? quotas.join(", ")
        : typeof error.message === "string"
          ? error.message.slice(0, 200)
          : fallback.description,
  };
}

export async function geminiCreditsError(
  response: Response,
  key?: string | null,
): Promise<QuotaExhaustedError> {
  const body = await response.text().catch(() => "");
  const detail = key ? body.replaceAll(key, "［非表示］") : body;
  const reason = detail ? ` (${parseQuotaError(detail).description})` : "";
  return new QuotaExhaustedError(
    `Gemini API の残高がありません (HTTP 402)${reason}。残高を補充するか、ローカルで動画を確かめるなら --tts openjtalk を使ってください`,
  );
}

// 1 分あたりの回数制限が切り替わるまで待てるようにする。
const BACKOFF_SEC = [1, 2, 4, 8, 16, 32, 64];

export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof RetryableError) || attempt >= BACKOFF_SEC.length) throw e;
      const waitSec = Math.min(120, Math.max(BACKOFF_SEC[attempt], e.retryAfterSec ?? 0));
      console.warn(`  ${label}: ${e.message} — ${waitSec} 秒後に再試行`);
      await sleep(waitSec * 1000);
    }
  }
}

/**
 * video:sync が台帳に足す回数。有効なあいだの Gemini TTS の HTTP リクエスト
 * (失敗と再試行を含む) だけを数える。手元の `--tts gemini` や、同じ API キーの
 * 別用途 (清書・イラスト・チュートリアル収録) はここを有効にしないので数えない。
 */
let geminiCallCounting = false;
let geminiCallCount = 0;

let onGeminiCall: (() => void) | undefined;

export function trackGeminiTtsCalls(enabled: boolean, onCall?: () => void): void {
  geminiCallCounting = enabled;
  onGeminiCall = enabled ? onCall : undefined;
  if (enabled) geminiCallCount = 0;
}

export function readGeminiTtsCalls(): number {
  return geminiCallCount;
}

async function checkedFetch(label: string, url: string, init: RequestInit): Promise<Response> {
  if (label === "gemini" && geminiCallCounting) {
    geminiCallCount += 1;
    onGeminiCall?.();
  }
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) });
  } catch (e) {
    throw new RetryableError(`${label}: 通信に失敗しました (${(e as Error).message})`);
  }
  if (label === "gemini" && res.status === 402)
    throw await geminiCreditsError(res, new Headers(init.headers).get("x-goog-api-key"));
  if (res.status === 429) {
    const quota = parseQuotaError(await res.text());
    if (quota.daily) {
      throw new QuotaExhaustedError(
        `${label}: HTTP 429 1 日の上限に達しました (${quota.description})`,
      );
    }
    throw new RetryableError(`${label}: HTTP 429 (${quota.description})`, quota.retryAfterSec);
  }
  if (res.status >= 500) {
    throw new RetryableError(`${label}: HTTP ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(`${label}: HTTP ${res.status} ${(await res.text()).slice(0, 500)}`);
  }
  return res;
}

function requireEnv(name: string, hint: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} が未設定です。${hint}`);
  return v;
}

/** 16bit PCM (little endian) に WAV ヘッダを付ける。 */
export function pcmToWav(pcm: Uint8Array, sampleRate: number, channels = 1): Uint8Array {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return new Uint8Array(Buffer.concat([header, Buffer.from(pcm)]));
}

function isRiff(bytes: Uint8Array): boolean {
  return bytes.length > 12 && Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF";
}

// ---------------------------------------------------------------- gemini

/** interactions API の output_audio / outputAudio、または steps 内の content から音声 (base64) を拾う。
 * steps 内に音声が複数あれば最後のものを使う。 */
export function geminiAudioField(data: unknown): string | undefined {
  const top = data as Record<string, unknown> | null;
  const out = (top?.output_audio ?? top?.outputAudio) as Record<string, unknown> | undefined;
  if (typeof out?.data === "string" && out.data.length > 0) return out.data;
  if (!Array.isArray(top?.steps)) return undefined;
  let audio: string | undefined;
  for (const step of top.steps) {
    if (!step || typeof step !== "object" || Array.isArray(step)) continue;
    if (!Array.isArray(step.content)) continue;
    for (const content of step.content) {
      if (!content || typeof content !== "object" || Array.isArray(content)) continue;
      if (content.type === "audio" && typeof content.data === "string" && content.data.length > 0) {
        audio = content.data;
      }
    }
  }
  return audio;
}

function geminiProvider(cfg: VoiceConfig): TtsProvider {
  const model = cfg.model ?? "gemini-3.8-flash-tts";
  const voice = cfg.voice ?? "Charon";
  const style = cfg.style ?? "";
  let quotaExhausted: QuotaExhaustedError | undefined;
  return {
    unit: "topic",
    identity: `gemini/${model}/${voice}/${style}`,
    // ponytail: 1 分におよそ 12 回の制限がある間は 1 つずつ合成する。上限が上がったら同時実行数を増やす。
    concurrency: 1,
    nondeterministic: true,
    async synthesize(speech) {
      if (quotaExhausted) throw quotaExhausted;
      const key = requireEnv(
        "GEMINI_API_KEY",
        "鍵なしで試すときは --tts openjtalk か --tts fake を付けてください",
      );
      const res = await withRetry("gemini", () =>
        checkedFetch("gemini", "https://generativelanguage.googleapis.com/v1beta/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            model,
            input: [
              {
                type: "user_input",
                content: [
                  {
                    type: "text",
                    text: speech,
                    ...(style ? { annotations: [{ type: "speech_metadata", style }] } : {}),
                  },
                ],
              },
            ],
            response_format: { type: "audio" },
            generation_config: { speech_config: [{ voice }] },
          }),
        }),
      ).catch((error: unknown) => {
        if (error instanceof QuotaExhaustedError) quotaExhausted = error;
        throw error;
      });
      const audio = geminiAudioField(await res.json());
      if (!audio) throw new Error("gemini: 応答に音声がありません");
      const bytes = new Uint8Array(Buffer.from(audio, "base64"));
      // 既定は WAV。response_format で PCM (L16) を選んだ場合に備えてヘッダを補う。
      return { bytes: isRiff(bytes) ? bytes : pcmToWav(bytes, 24_000), ext: "wav" };
    },
  };
}

// ---------------------------------------------------------------- grok (AI Gateway)

/** `/ai/run` の封筒から音声 (署名付き URL か base64) を拾う (workers-ai.ts と同じ読み方)。 */
export function grokAudioField(data: unknown): string | undefined {
  const rec = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);
  const top = rec(data);
  if (!top) return undefined;
  if (typeof top.audio === "string" && top.audio) return top.audio;
  const mid = rec(top.result);
  if (typeof mid?.audio === "string" && mid.audio) return mid.audio;
  const inner = rec(mid?.result);
  return typeof inner?.audio === "string" && inner.audio ? inner.audio : undefined;
}

function grokProvider(cfg: VoiceConfig): TtsProvider {
  const model = cfg.model ?? "xai/grok-tts";
  const voice = cfg.voice ?? "eve";
  const lang = cfg.lang ?? "ja";
  return {
    unit: "cue",
    identity: `grok/${model}/${voice}/${lang}`,
    concurrency: 4,
    nondeterministic: true,
    async synthesize(speech) {
      const hint = "Grok TTS は AI Gateway (Unified Billing) 経由でだけ呼べます";
      const account = requireEnv("CLOUDFLARE_ACCOUNT_ID", hint);
      const gateway = requireEnv("AI_GATEWAY_ID", hint);
      const token = requireEnv("AI_GATEWAY_CF_API_TOKEN", hint);
      const res = await withRetry("grok", () =>
        checkedFetch("grok", `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "cf-aig-gateway-id": gateway,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model, input: { text: speech, voice_id: voice, language: lang } }),
        }),
      );
      const audio = grokAudioField(await res.json());
      if (!audio) throw new Error("grok: 応答に音声がありません");
      if (audio.startsWith("https://")) {
        const file = await withRetry("grok-audio", () => checkedFetch("grok-audio", audio, {}));
        return { bytes: new Uint8Array(await file.arrayBuffer()), ext: "mp3" };
      }
      return { bytes: new Uint8Array(Buffer.from(audio, "base64")), ext: "mp3" };
    },
  };
}

// ---------------------------------------------------------------- openjtalk (ローカル)

export const ttsVenv = fileURLToPath(new URL("../../.venv-tts", import.meta.url));
export const openJtalkScript = fileURLToPath(new URL("../tts/openjtalk_tts.py", import.meta.url));
export const openJtalkSetupHint = "bun run --filter=@stella/content video:tts:setup";

export function venvPython(venv: string, platform: NodeJS.Platform): string {
  return platform === "win32"
    ? win32.join(venv, "Scripts", "python.exe")
    : posix.join(venv, "bin", "python");
}

export const runTtsCommand = (command: string, args: string[], input?: string) =>
  spawnSync(command, args, { input, windowsHide: true });

export function findOpenJtalkPython(
  run = runTtsCommand,
  override = process.env.STELLA_TTS_PYTHON,
  platform = process.platform,
  venv = ttsVenv,
): string {
  for (const python of [override?.trim(), venvPython(venv, platform), "python3", "python"]) {
    if (python && run(python, ["-c", "import pyopenjtalk"]).status === 0) return python;
  }
  throw new Error(
    `Open JTalk の準備ができていません。候補の Python で pyopenjtalk を読み込めませんでした。Python 3.10〜3.13 で pyopenjtalk-plus を準備するには、${openJtalkSetupHint} を実行してください。音声なしで確かめるなら --tts fake を使ってください`,
  );
}

let python: string | undefined;
export function prepareOpenJtalk(): string {
  python ??= findOpenJtalkPython();
  return python;
}

export function isWave(bytes: Uint8Array): boolean {
  const header = Buffer.from(bytes.subarray(0, 12));
  return header.toString("latin1", 0, 4) === "RIFF" && header.toString("latin1", 8, 12) === "WAVE";
}

export function openJtalkErrorDetail(stderr: Buffer): string {
  return stderr
    .toString()
    .split(/\r?\n/)
    .filter(
      (line) =>
        !line.includes("Warning: ONNX Runtime is not installed") &&
        !line.includes("Please install ONNX Runtime by"),
    )
    .join("\n")
    .trim();
}

function openjtalkProvider(cfg: VoiceConfig): TtsProvider {
  const speed = cfg.speed ?? 1.1;
  return {
    unit: "cue",
    identity: `openjtalk/${speed}`,
    concurrency: 4,
    nondeterministic: false,
    async synthesize(speech) {
      const python = prepareOpenJtalk();
      return new Promise((resolve, reject) => {
        const child = spawn(python, [openJtalkScript, String(speed)], {
          stdio: ["pipe", "pipe", "pipe"],
        });
        const out: Buffer[] = [];
        const err: Buffer[] = [];
        child.stdout.on("data", (d: Buffer) => out.push(d));
        child.stderr.on("data", (d: Buffer) => err.push(d));
        child.on("error", reject);
        child.stdin.on("error", reject);
        child.on("close", (code) => {
          if (code !== 0) {
            reject(
              new Error(
                `Open JTalk の合成に失敗しました (${openJtalkErrorDetail(Buffer.concat(err)).split("\n").at(-1) || code})。${openJtalkSetupHint} で準備を確かめてください`,
              ),
            );
            return;
          }
          const bytes = Buffer.concat(out);
          if (!isWave(bytes)) {
            reject(new Error("Open JTalk の出力が WAV (RIFF/WAVE) ではありません"));
            return;
          }
          resolve({ bytes, ext: "wav" });
        });
        child.stdin.end(speech);
      });
    },
  };
}

// ---------------------------------------------------------------- fake

function fakeProvider(): TtsProvider {
  return {
    unit: "cue",
    identity: "fake/1",
    concurrency: 8,
    nondeterministic: false,
    async synthesize(speech) {
      // 推定長ぶんの小さな 440Hz。無音だと ④ の無音削りで長さ 0 になるため音にする。
      const rate = 24_000;
      const n = Math.round(estimateSpeechSeconds(speech) * rate);
      const pcm = Buffer.alloc(n * 2);
      for (let i = 0; i < n; i++) {
        pcm.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 2000), i * 2);
      }
      return { bytes: pcmToWav(pcm, rate), ext: "wav" };
    },
  };
}

// ---------------------------------------------------------------- 入口

export function createTtsProvider(cfg: VoiceConfig): TtsProvider {
  switch (cfg.provider) {
    case "gemini":
      return geminiProvider(cfg);
    case "grok":
      return grokProvider(cfg);
    case "openjtalk":
      return openjtalkProvider(cfg);
    case "fake":
      return fakeProvider();
    default:
      throw new Error(`未知の TTS プロバイダです: ${String(cfg.provider)}`);
  }
}

/** 字幕の音声キャッシュのキー。 */
export function cueHash(identity: string, speech: string): string {
  return createHash("sha256").update(`${identity}\n${speech}`).digest("hex").slice(0, 32);
}

/** build-video と場面動画が synthesizeCached に渡すディレクトリ。 */
export function lessonVideoTtsCacheDir(contentRoot: string): string {
  return join(contentRoot, "dist/video-cache/tts");
}

function ttsCacheFiles(identity: string, speech: string, cacheDir: string): string[] {
  const hash = cueHash(identity, speech);
  return (["wav", "mp3"] as const).map((ext) => join(cacheDir, `${hash}.${ext}`));
}

/**
 * 合成せずに、キャッシュが使えるかを返す。キーと拡張子と空ファイルの扱いは
 * synthesizeCached と同じ。壊れたローカル wav はヒットにしない。
 * removeStale のときだけ、合成の直前に壊れたファイルを消す (回数の確認では消さない)。
 */
function cachedTtsHit(
  identity: string,
  speech: string,
  cacheDir: string,
  removeStale: boolean,
): string | null {
  const localWav = /^(openjtalk|fake)\//.test(identity);
  for (const file of ttsCacheFiles(identity, speech, cacheDir)) {
    if (!existsSync(file)) continue;
    const bytes = readFileSync(file);
    if (localWav && file.endsWith(".wav") && !isWave(bytes)) {
      if (removeStale) rmSync(file, { force: true });
      continue;
    }
    if (bytes.length > 0) return file;
  }
  return null;
}

export function hasCachedTts(identity: string, speech: string, cacheDir: string): boolean {
  return cachedTtsHit(identity, speech, cacheDir, false) !== null;
}

export interface TtsTopicPlan {
  stageSlug: string;
  id: string;
  kind: "scene" | "narration" | "recorded";
  speeches: readonly string[];
}

export interface TtsCallTopic {
  stageSlug: string;
  id: string;
  kind: TtsTopicPlan["kind"];
  calls: number;
}

/**
 * 実際に外部 TTS を呼ぶ回数。キャッシュにある音声と、同じ読み上げの 2 件目以降は数えない。
 * 新方式は場面ごと、旧方式で Gemini (unit が topic) のときはトピックごとに 1 件の speech を渡す。
 */
export function countTtsCalls(
  topics: readonly TtsTopicPlan[],
  identity: string,
  cacheDir: string,
): { topics: TtsCallTopic[]; needed: number } {
  const seen = new Set<string>();
  const rows = topics.map((topic) => {
    let calls = 0;
    for (const speech of topic.speeches) {
      const hash = cueHash(identity, speech);
      if (seen.has(hash)) continue;
      seen.add(hash);
      if (!hasCachedTts(identity, speech, cacheDir)) calls += 1;
    }
    return { stageSlug: topic.stageSlug, id: topic.id, kind: topic.kind, calls };
  });
  return { topics: rows, needed: rows.reduce((sum, row) => sum + row.calls, 0) };
}

export interface CachedTts {
  file: string;
  cached: boolean;
}

/**
 * 進行中・完了済みの合成 (プロセス内)。同じ読み上げ文を同時に頼まれても外部 TTS を
 * 1 回しか呼ばず (重複課金しない)、同じキャッシュファイルへ別々の音声を書き合わない。
 * `refresh` (異常長の作り直し) も 1 つの読み上げ文につき 1 回まで — 2 本目以降の
 * トピックは作り直した音声をそのまま使う。
 */
const inflight = new Map<string, Promise<CachedTts>>();

/** キャッシュにあればそれを、無ければ合成して書く。`refresh` はキャッシュを無視して作り直す。 */
export function synthesizeCached(
  provider: TtsProvider,
  speech: string,
  cacheDir: string,
  refresh = false,
): Promise<CachedTts> {
  const key = `${join(cacheDir, cueHash(provider.identity, speech))}${refresh ? "#refresh" : ""}`;
  const running = inflight.get(key);
  if (running) return running;
  const job = synthesizeUncached(provider, speech, cacheDir, refresh);
  inflight.set(key, job);
  // 同時の要求だけをまとめる。完了後の refresh は新たに合成する。
  const forget = () => inflight.delete(key);
  job.then(forget, forget);
  return job;
}

const synthesisSlots = new WeakMap<TtsProvider, { running: number; waiters: (() => void)[] }>();

// 呼び出し元が並列でも、プロバイダの同時実行数の上限を超えないようにする。
async function synthesizeLimited(provider: TtsProvider, speech: string): Promise<TtsAudio> {
  let slots = synthesisSlots.get(provider);
  if (!slots) {
    slots = { running: 0, waiters: [] };
    synthesisSlots.set(provider, slots);
  }
  const limit = Number.isFinite(provider.concurrency)
    ? Math.max(1, Math.floor(provider.concurrency))
    : 1;
  if (slots.running >= limit) {
    await new Promise<void>((resolve) => slots.waiters.push(resolve));
  } else {
    slots.running++;
  }
  try {
    return await provider.synthesize(speech);
  } finally {
    const next = slots.waiters.shift();
    if (next) next();
    else slots.running--;
  }
}

async function synthesizeUncached(
  provider: TtsProvider,
  speech: string,
  cacheDir: string,
  refresh: boolean,
): Promise<CachedTts> {
  if (!refresh) {
    const file = cachedTtsHit(provider.identity, speech, cacheDir, true);
    if (file) return { file, cached: true };
  }
  const audio = await synthesizeLimited(provider, speech);
  if (audio.bytes.length === 0) throw new Error("TTS の結果が空でした");
  mkdirSync(cacheDir, { recursive: true });
  const hash = cueHash(provider.identity, speech);
  const file = join(cacheDir, `${hash}.${audio.ext}`);
  writeFileSync(file, audio.bytes);
  return { file, cached: false };
}

/** 並列数を絞って順に流す。 */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, worker),
  );
  return results;
}
