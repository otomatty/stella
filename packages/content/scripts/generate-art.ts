import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildArtRequest,
  parseVideoArt,
  selectArtReference,
  STYLE_REFERENCE,
} from "../src/video-art";
import { isRecord } from "../src/video-shots";
import { RetryableError, withRetry } from "./lib/tts";

const root = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);
async function main() {
  const topics: string[] = [];
  let only: string[] | undefined;
  let ref: string | undefined;
  let force = false,
    dryRun = false;
  let model = process.env.VIDEO_ART_MODEL?.trim() || "gemini-nano-banana-2.1";
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") continue;
    if (arg === "--force") force = true;
    else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--only" || arg === "--model" || arg === "--ref") {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error(`${arg} に値を指定してください`);
      if (arg === "--only") {
        only = value.split(",");
        if (!only.every((n) => /^[a-z0-9-]+$/.test(n))) throw new Error("--only の名前が不正です");
      } else if (arg === "--ref") {
        if (!/^[a-z0-9-]+$/.test(value)) throw new Error("--ref の名前が不正です");
        ref = value;
      } else model = value;
    } else if (arg.startsWith("--")) throw new Error(`不明な引数: ${arg}`);
    else topics.push(arg);
  }
  if (!topics.length) throw new Error("トピックのパスを指定してください");
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new Error("モデルの id が不正です");
  const style = await readFile(join(root, "narration/art-style.md"), "utf8");
  let count = 0;
  for (const topic of topics) {
    const dir = resolve(root, topic);
    const storyboard: unknown = JSON.parse(await readFile(join(dir, "video.json"), "utf8"));
    if (!isRecord(storyboard)) throw new Error(`${topic}: video.json はオブジェクトにしてください`);
    const art = parseVideoArt(storyboard.art);
    if (only)
      for (const name of only)
        if (!(name in art)) throw new Error(`${topic}: art「${name}」がありません`);
    const out = join(dir, "assets/art");
    if (ref !== undefined) {
      const files = existsSync(out) ? await readdir(out) : [];
      selectArtReference(files, undefined, ref);
      // 対象に手本が混じっていたら、ほかの絵を生成する前に止める。
      for (const name of Object.keys(art)) {
        if (only && !only.includes(name)) continue;
        if (existsSync(join(out, `${name}.png`)) && !force && !only) continue;
        selectArtReference(files, name, ref);
      }
    }
    for (const name of Object.keys(art).sort()) {
      if (only && !only.includes(name)) continue;
      const file = join(out, `${name}.png`);
      if (existsSync(file) && !force && !only) continue;
      const reference = selectArtReference(existsSync(out) ? await readdir(out) : [], name, ref);
      const body = buildArtRequest(
        style,
        art[name],
        reference ? (await readFile(join(out, reference))).toString("base64") : undefined,
      );
      count++;
      if (dryRun) {
        console.log(
          `作成予定: ${file}\nモデル: ${model}\n縦横比: ${art[name].aspect}${reference ? `\n絵柄の参照: ${reference}\n${STYLE_REFERENCE}` : ""}\n${style.trim()}\n\nScene: ${art[name].prompt}`,
        );
        continue;
      }
      const key = process.env.GEMINI_API_KEY?.trim();
      if (!key)
        throw new Error(
          "GEMINI_API_KEY が設定されていません。生成せずに確認するには --dry-run を付けてください",
        );
      const data: unknown = await withRetry("イラスト生成", async () => {
        let res: Response;
        try {
          res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-goog-api-key": key },
              body: JSON.stringify(body),
              signal: AbortSignal.timeout(120_000),
            },
          );
        } catch {
          throw new RetryableError("通信に失敗しました");
        }
        if (res.status === 429 || res.status >= 500) {
          await res.body?.cancel();
          throw new RetryableError(`HTTP ${res.status}`);
        }
        if (!res.ok) {
          await res.body?.cancel();
          throw new Error(`イラスト生成に失敗しました (HTTP ${res.status})`);
        }
        try {
          return await res.json();
        } catch {
          throw new RetryableError("応答の受信に失敗しました");
        }
      });
      const candidates = isRecord(data) && Array.isArray(data.candidates) ? data.candidates : [];
      const content = isRecord(candidates[0]) ? candidates[0].content : undefined;
      const parts = isRecord(content) && Array.isArray(content.parts) ? content.parts : [];
      const image = parts
        .filter(isRecord)
        .map((p) => p.inlineData)
        .find(
          (p) =>
            isRecord(p) &&
            typeof p.mimeType === "string" &&
            p.mimeType.startsWith("image/") &&
            typeof p.data === "string",
        );
      if (!isRecord(image) || typeof image.data !== "string" || !image.data)
        throw new Error("応答に画像がありません");
      const work = await mkdtemp(join(tmpdir(), "stella-art-"));
      const pending = join(out, `${name}.pending.png`);
      try {
        await mkdir(out, { recursive: true });
        const input = join(work, "image");
        await writeFile(input, Buffer.from(image.data, "base64"));
        await run("ffmpeg", [
          "-hide_banner",
          "-nostdin",
          "-y",
          "-loglevel",
          "error",
          "-i",
          input,
          "-vf",
          "scale=w='min(1600,iw)':h='min(1600,ih)':force_original_aspect_ratio=decrease",
          "-frames:v",
          "1",
          pending,
        ]);
        await rename(pending, file);
        console.log(`作成しました: ${file}`);
      } finally {
        await rm(work, { recursive: true, force: true });
        await rm(pending, { force: true });
      }
    }
  }
  if (!count) console.log("作る絵はありません");
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
