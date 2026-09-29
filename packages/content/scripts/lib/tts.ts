/**
 * 教材動画の読み上げ (設計書の ② 読み上げ)。字幕 1 つにつき 1 回呼ぶ。
 *
 * プロバイダ:
 * - gemini    … Gemini 3.8 Flash TTS (既定。参考設計書と同じ interactions API)。GEMINI_API_KEY
 * - grok      … xAI Grok TTS を Cloudflare AI Gateway (Unified Billing) 経由で。面談対策と同じ経路
 *               (apps/api/src/lib/workers-ai.ts)。CLOUDFLARE_ACCOUNT_ID / AI_GATEWAY_ID /
 *               AI_GATEWAY_CF_API_TOKEN
 * - openjtalk … ローカルの Open JTalk (`pip install pyopenjtalk-prebuilt "numpy<2"`)。
 *               鍵なしで本物の日本語音声を出す開発用。声質は機械的
 * - fake      … 推定長の小さな音 (鍵も Python も要らない。描画・同期・配信の確認用)
 *
 * 生の出力をローカルにキャッシュする (キー = プロバイダの識別子 + 読み上げ文)。
 * 字幕を 1 つ直すと呼び直すのはその字幕だけで、他の字幕は前と同じ音声のまま。
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { estimateSpeechSeconds } from "../../src/narration.js";

const here = dirname(fileURLToPath(import.meta.url));

export type TtsProviderName = "gemini" | "grok" | "openjtalk" | "fake";

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
export class RetryableError extends Error {}

const BACKOFF_SEC = [1, 2, 4, 8, 16];

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
      console.warn(`  ${label}: ${e.message} — ${BACKOFF_SEC[attempt]} 秒後に再試行`);
      await sleep(BACKOFF_SEC[attempt] * 1000);
    }
  }
}

async function checkedFetch(label: string, url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) });
  } catch (e) {
    throw new RetryableError(`${label}: 通信に失敗しました (${(e as Error).message})`);
  }
  if (res.status === 429 || res.status >= 500) {
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

/** interactions API の応答から音声 (base64) を拾う。SDK と REST で綴りが揺れても読めるように。 */
export function geminiAudioField(data: unknown): string | undefined {
  const top = data as Record<string, unknown> | null;
  const out = (top?.output_audio ?? top?.outputAudio) as Record<string, unknown> | undefined;
  return typeof out?.data === "string" && out.data.length > 0 ? out.data : undefined;
}

function geminiProvider(cfg: VoiceConfig): TtsProvider {
  const model = cfg.model ?? "gemini-3.8-flash-tts";
  const voice = cfg.voice ?? "Charon";
  const style = cfg.style ?? "";
  return {
    identity: `gemini/${model}/${voice}/${style}`,
    concurrency: 4,
    nondeterministic: true,
    async synthesize(speech) {
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
      );
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

function openjtalkProvider(cfg: VoiceConfig): TtsProvider {
  const speed = cfg.speed ?? 1.1;
  const script = join(here, "..", "tts", "openjtalk_tts.py");
  return {
    identity: `openjtalk/${speed}`,
    concurrency: 4,
    nondeterministic: false,
    synthesize(speech) {
      return new Promise((resolve, reject) => {
        const child = spawn("python3", [script, String(speed)], {
          stdio: ["pipe", "pipe", "pipe"],
        });
        const out: Buffer[] = [];
        const err: Buffer[] = [];
        child.stdout.on("data", (d: Buffer) => out.push(d));
        child.stderr.on("data", (d: Buffer) => err.push(d));
        child.on("error", reject);
        child.on("close", (code) => {
          if (code !== 0) {
            reject(
              new Error(
                `openjtalk: ${Buffer.concat(err).toString().trim().split("\n").at(-1)} ` +
                  '(pip install pyopenjtalk-prebuilt "numpy<2" が必要です)',
              ),
            );
            return;
          }
          resolve({ bytes: new Uint8Array(Buffer.concat(out)), ext: "wav" });
        });
        child.stdin.end(speech);
      });
    },
  };
}

// ---------------------------------------------------------------- fake

function fakeProvider(): TtsProvider {
  return {
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
  if (!refresh) {
    // 通常の合成は終わったら外す (以降はディスクのキャッシュを読む)。作り直しは残す。
    const forget = () => inflight.delete(key);
    job.then(forget, forget);
  }
  return job;
}

async function synthesizeUncached(
  provider: TtsProvider,
  speech: string,
  cacheDir: string,
  refresh: boolean,
): Promise<CachedTts> {
  const hash = cueHash(provider.identity, speech);
  for (const ext of ["wav", "mp3"] as const) {
    const file = join(cacheDir, `${hash}.${ext}`);
    if (!refresh && existsSync(file) && readFileSync(file).length > 0) {
      return { file, cached: true };
    }
  }
  const audio = await provider.synthesize(speech);
  if (audio.bytes.length === 0) throw new Error("TTS の結果が空でした");
  mkdirSync(cacheDir, { recursive: true });
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
