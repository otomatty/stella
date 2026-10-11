export interface ProviderConfig {
  BUCKET: R2Bucket;
  GEMINI_API_KEY: string;
  OCR_MODEL: string;
  TTS_MODEL: string;
  TTS_VOICE: string;
  FAKE_PROVIDERS?: string;
}
// 移植元の Gemini Interactions API アダプター。ローカルとCIは偽プロバイダを使う。
// 外部送信・モデルの品質と利用枠を検証するまでは、処理Workerの本番フラグを無効にする。
import { OCR_SCHEMA, ocrPrompt } from "./ocr";
import { num } from "./util";

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}
export interface OcrFile {
  name: string;
  uri: string;
}
export interface OcrProvider {
  model: string;
  /** R2のPDFを事業者のファイル受け口に置く(Workersのメモリには載せない) */
  upload(r2Key: string, sizeBytes: number, displayName: string): Promise<OcrFile>;
  /** PDFの from〜to ページ(PDFの中での番号、1始まり)を読む。応答はJSONの文字列 */
  read(file: OcrFile, from: number, to: number): Promise<{ text: string; usage: Usage }>;
  remove(file: OcrFile): Promise<void>;
}
export interface TtsProvider {
  model: string;
  /** 16ビット・モノラルのPCMを返す */
  synthesize(text: string): Promise<{ pcm: Uint8Array; sampleRate: number; usage: Usage }>;
}

/** 失敗の分類(jobs.error_code)をメッセージの先頭に入れる。Workflowsの工程をまたぐと例外の型が残らないため。 */
export class ProviderError extends Error {
  constructor(code: "provider_error" | "provider_rate_limited", message: string) {
    super(`[${code}] ${message}`);
  }
}

// 単価は移植元から引き継がない。利用量を記録し、契約に合わせた見積りは運用側で行う。
export function estimateCost(
  _model: string,
  _unit: "input_token" | "output_token",
  _quantity: number,
): null {
  return null;
}

export const ocrProvider = (env: ProviderConfig): OcrProvider =>
  env.FAKE_PROVIDERS === "1" ? fakeOcr(env) : geminiOcr(env);
export const ttsProvider = (env: ProviderConfig): TtsProvider =>
  env.FAKE_PROVIDERS === "1" ? fakeTts(env) : geminiTts(env);

// ---- Gemini ----

const BASE = "https://generativelanguage.googleapis.com";

async function check(res: Response, what: string): Promise<Response> {
  if (res.ok) return res;
  await res.body?.cancel();
  throw new ProviderError(
    res.status === 429 ? "provider_rate_limited" : "provider_error",
    `${what}が失敗しました(HTTP ${res.status}): `,
  );
}

interface Interaction {
  steps?: {
    type: string;
    content?: { type: string; text?: string; data?: string; mime_type?: string }[];
  }[];
  usage?: {
    total_input_tokens?: number;
    total_output_tokens?: number;
    total_thought_tokens?: number;
  };
}

async function interact(
  env: ProviderConfig,
  body: object,
  what: string,
): Promise<{
  outputs: NonNullable<NonNullable<Interaction["steps"]>[number]["content"]>;
  usage: Usage;
}> {
  const res = await check(
    await fetch(`${BASE}/v1beta/interactions`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      // store: false … 事業者側に応答を保存させない
      body: JSON.stringify({ ...body, store: false }),
    }),
    what,
  );
  const it = (await res.json()) as Interaction;
  const outputs = (it.steps ?? [])
    .filter((s) => s.type === "model_output")
    .flatMap((s) => s.content ?? []);
  const u = it.usage ?? {};
  // 思考のトークンは出力として課金される
  return {
    outputs,
    usage: {
      inputTokens: u.total_input_tokens ?? 0,
      outputTokens: (u.total_output_tokens ?? 0) + (u.total_thought_tokens ?? 0),
    },
  };
}

function geminiOcr(env: ProviderConfig): OcrProvider {
  const key = { "x-goog-api-key": env.GEMINI_API_KEY };
  return {
    model: env.OCR_MODEL,
    async upload(r2Key, sizeBytes, displayName) {
      const start = await check(
        await fetch(`${BASE}/upload/v1beta/files`, {
          method: "POST",
          headers: {
            ...key,
            "content-type": "application/json",
            "X-Goog-Upload-Protocol": "resumable",
            "X-Goog-Upload-Command": "start",
            "X-Goog-Upload-Header-Content-Length": String(sizeBytes),
            "X-Goog-Upload-Header-Content-Type": "application/pdf",
          },
          body: JSON.stringify({ file: { display_name: displayName } }),
        }),
        "PDFの送信の開始",
      );
      const uploadUrl = start.headers.get("x-goog-upload-url");
      if (!uploadUrl) throw new ProviderError("provider_error", "PDFの送信先が返りませんでした");
      const obj = await env.BUCKET.get(r2Key);
      if (!obj) throw new Error(`R2にPDFがありません: ${r2Key}`);
      // 長さの決まったストリームにして、R2からそのまま流し込む
      const { readable, writable } = new FixedLengthStream(obj.size);
      const pipe = obj.body.pipeTo(writable);
      const done = await check(
        await fetch(uploadUrl, {
          method: "POST",
          headers: { "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" },
          body: readable,
        }),
        "PDFの送信",
      );
      await pipe;
      let file = ((await done.json()) as { file: { name: string; uri: string; state?: string } })
        .file;
      for (let i = 0; i < 90 && file.state && file.state !== "ACTIVE"; i++) {
        if (file.state === "FAILED")
          throw new ProviderError("provider_error", "事業者側でPDFの取り込みに失敗しました");
        await new Promise((r) => setTimeout(r, 2000));
        file = (await (
          await check(
            await fetch(`${BASE}/v1beta/${file.name}`, { headers: key }),
            "PDFの状態の確認",
          )
        ).json()) as typeof file;
      }
      return { name: file.name, uri: file.uri };
    },
    async read(file, from, to) {
      const { outputs, usage } = await interact(
        env,
        {
          model: env.OCR_MODEL,
          input: [
            { type: "document", uri: file.uri, mime_type: "application/pdf" },
            { type: "text", text: ocrPrompt(from, to) },
          ],
          response_format: { type: "text", mime_type: "application/json", schema: OCR_SCHEMA },
        },
        "OCR",
      );
      return {
        text: outputs
          .filter((o) => o.type === "text")
          .map((o) => o.text ?? "")
          .join(""),
        usage,
      };
    },
    async remove(file) {
      // 失敗しても48時間で自動的に消える
      await fetch(`${BASE}/v1beta/${file.name}`, { method: "DELETE", headers: key }).catch(() => {
        /* Remote files expire even if deletion fails. */
      });
    },
  };
}

function geminiTts(env: ProviderConfig): TtsProvider {
  return {
    model: env.TTS_MODEL,
    async synthesize(text) {
      const { outputs, usage } = await interact(
        env,
        {
          model: env.TTS_MODEL,
          input: [{ type: "user_input", content: [{ type: "text", text }] }],
          response_format: { type: "audio" },
          generation_config: { speech_config: [{ voice: env.TTS_VOICE, language: "ja-JP" }] },
        },
        "音声の生成",
      );
      const audio = outputs.find((o) => o.type === "audio" && o.data);
      if (!audio?.data) throw new ProviderError("provider_error", "音声が返りませんでした");
      const bytes = Uint8Array.from(atob(audio.data), (ch) => ch.charCodeAt(0));
      return { ...toPcm(bytes, audio.mime_type ?? ""), usage };
    },
  };
}

/** WAVならヘッダーを外してPCMを取り出す。ヘッダーのないPCMはそのまま(標本化周波数は mime_type の rate、なければ24kHz)。 */
export function toPcm(
  bytes: Uint8Array,
  mimeType: string,
): { pcm: Uint8Array; sampleRate: number } {
  const ascii = (o: number) => String.fromCharCode(...bytes.subarray(o, o + 4));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 12 && ascii(0) === "RIFF") {
    let sampleRate = 24000;
    let off = 12;
    while (off + 8 <= bytes.length) {
      const id = ascii(off);
      const size = view.getUint32(off + 4, true);
      if (id === "fmt ") sampleRate = view.getUint32(off + 12, true);
      if (id === "data")
        return { pcm: bytes.subarray(off + 8, Math.min(off + 8 + size, bytes.length)), sampleRate };
      off += 8 + size + (size % 2);
    }
    throw new ProviderError("provider_error", "WAVの中に音のデータがありません");
  }
  return { pcm: bytes, sampleRate: num(mimeType.match(/rate=(\d+)/)?.[1], 24000) };
}

// ---- 偽物(手元とテスト用) ----
// R2の `_fake/ocr-fail.json`({"pages":[3]})があると、そのページを含む範囲で失敗する。
// R2の `_fake/tts-fail.json`({"remaining":2})があると、その回数だけ失敗する。

function fakeOcr(env: ProviderConfig): OcrProvider {
  return {
    model: "fake-ocr",
    async upload(r2Key) {
      return { name: `fake/${r2Key}`, uri: r2Key };
    },
    async read(_file, from, to) {
      const fail =
        (await (await env.BUCKET.get("_fake/ocr-fail.json"))?.json<{ pages: number[] }>())?.pages ??
        [];
      if (fail.some((p) => p >= from && p <= to))
        throw new ProviderError("provider_error", `偽物のOCRの失敗(ページ ${from}-${to})`);
      const pages = [];
      for (let p = from; p <= to; p++) {
        const parts: string[] = [];
        if (p === 1 || p % 7 === 0) parts.push(`# 第${Math.floor(p / 7) + 1}章 検証用の章`);
        parts.push(`## ${p}ページ目の節`, `これは${p}ページ目の本文です。検証用の文章[^1]。`);
        if (p % 3 === 0) parts.push(`![図${p} 検証用の図](fig:1)`);
        if (p % 5 === 0)
          parts.push("| 列 | 値 |\n| --- | --- |\n| a | 1 |", '```\nconsole.log("code");\n```');
        parts.push(`[^1]: ${p}ページの脚注です。`);
        pages.push({
          page: p,
          markdown: parts.join("\n\n"),
          figures:
            p % 3 === 0
              ? [{ id: "1", box: [300, 100, 600, 900], caption: `図${p} 検証用の図` }]
              : [],
        });
      }
      return {
        text: JSON.stringify({ pages }),
        usage: { inputTokens: 258 * (to - from + 1), outputTokens: 500 * (to - from + 1) },
      };
    },
    async remove() {
      /* Fake uploads do not create remote files. */
    },
  };
}

function fakeTts(env: ProviderConfig): TtsProvider {
  return {
    model: "fake-tts",
    async synthesize(text) {
      const obj = await env.BUCKET.get("_fake/tts-fail.json");
      if (obj) {
        const { remaining } = await obj.json<{ remaining: number }>();
        if (remaining > 0) {
          await env.BUCKET.put("_fake/tts-fail.json", JSON.stringify({ remaining: remaining - 1 }));
          throw new ProviderError("provider_error", "偽物のTTSの失敗");
        }
      }
      // 1文字0.05秒の無音
      const samples = Math.max(1, Math.floor(text.length * 0.05 * 24000));
      return {
        pcm: new Uint8Array(samples * 2),
        sampleRate: 24000,
        usage: { inputTokens: text.length, outputTokens: samples / 960 },
      };
    },
  };
}
