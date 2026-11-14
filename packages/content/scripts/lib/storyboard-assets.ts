import { createHash } from "node:crypto";
import {
  existsSync,
  globSync,
  readFileSync,
  openSync,
  readSync,
  closeSync,
  mkdirSync,
} from "node:fs";
import { join, resolve, relative, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import type { ViewImage } from "../../src/scene-view.js";
import { parseVideoArt } from "../../src/video-art.js";
import { SHOT_ID, validRegion, isRecord } from "../../src/video-shots.js";
import {
  clipReference,
  type ClipInfo,
  type StoryboardContext,
  type VideoStoryboard,
} from "../../src/video-storyboard.js";

import { runFfmpeg } from "./scene-encode.js";

// 大きい収録もメモリーへ丸ごと載せず、プロセス内で一度だけ読む。
const videoHashes = new Map<string, string>();
export function videoContentHash(file: string): string {
  const cached = videoHashes.get(file);
  if (cached) return cached;
  const hash = createHash("sha256"),
    buffer = Buffer.alloc(1024 * 1024);
  const fd = openSync(file, "r");
  try {
    for (;;) {
      const size = readSync(fd, buffer, 0, buffer.length, null);
      if (!size) break;
      hash.update(buffer.subarray(0, size));
    }
  } finally {
    closeSync(fd);
  }
  const value = hash.digest("hex");
  videoHashes.set(file, value);
  return value;
}
/** ファイルの読み込みは検査の純関数から分ける。使う素材だけをキャッシュへ含める。 */
export function storyboardAssets(
  root: string,
  topic: string,
  json: unknown,
  options: { allowMissingClips?: boolean } = {},
) {
  const context: StoryboardContext = { shots: {}, clips: {}, artFiles: new Set() };
  const images: Record<string, ViewImage> = {};
  const hashes: Record<string, string> = {};
  const sb = json as VideoStoryboard;
  const refs = new Set<string>();
  for (const scene of sb.scenes ?? []) {
    if (scene.kind === "view") {
      refs.add(scene.image);
      for (const b of scene.beats ?? []) {
        if (b.image) refs.add(b.image);
        if (b.clip) refs.add(`clip:${b.clip}`);
      }
    }
  }
  for (const board of Object.values(sb.boards ?? {}))
    for (const node of board.nodes ?? []) if (node.art) refs.add(`art:${node.art}`);
  const digest = (...bytes: Uint8Array[]) => {
    const h = createHash("sha256");
    for (const b of bytes) h.update(b);
    return h.digest("hex");
  };
  const clips: Record<string, ClipInfo> = {};
  for (const file of globSync("**/*.json", { cwd: join(root, "clips") })) {
    const id = file.replace(/\\/g, "/").slice(0, -5);
    if (!SHOT_ID.test(id)) continue;
    const bytes = readFileSync(join(root, "clips", file));
    const meta: unknown = JSON.parse(bytes.toString());
    if (
      !isRecord(meta) ||
      typeof meta.video !== "string" ||
      ![meta.width, meta.height, meta.fps, meta.duration].every(
        (n) => typeof n === "number" && Number.isFinite(n) && n > 0,
      ) ||
      !isRecord(meta.marks) ||
      !Object.values(meta.marks).every(
        (r) =>
          Array.isArray(r) &&
          r.length === 2 &&
          r.every(Number.isFinite) &&
          r[0] >= 0 &&
          r[0] < r[1] &&
          r[1] <= Number(meta.duration),
      ) ||
      !isRecord(meta.regions) ||
      !Object.values(meta.regions).every((r) =>
        validRegion(r, Number(meta.width), Number(meta.height)),
      )
    )
      throw new Error(`クリップの定義が不正です: ${id}`);
    const video = resolve(root, meta.video);
    const local = relative(resolve(root), video);
    if (isAbsolute(meta.video) || local === ".." || local.startsWith("../"))
      throw new Error(`クリップの動画は content 内の相対パスにしてください: ${id}`);
    if (!existsSync(video)) {
      if (options.allowMissingClips) continue;
      throw new Error(`クリップの動画がありません: ${id} (${meta.video})`);
    }
    const clip = meta as unknown as ClipInfo;
    if (context.clips) context.clips[id] = clip;
    for (const ref of refs) {
      if (!ref.startsWith("clip:")) continue;
      const parsed = clipReference(ref.slice(5));
      if (parsed?.id !== id || !clip.marks[parsed.mark]) continue;
      images[ref] = { width: clip.width, height: clip.height, regions: clip.regions, url: "" };
      clips[ref] = clip;
      hashes[ref] = digest(bytes, Buffer.from(videoContentHash(video)));
    }
  }
  const shotsRoot = join(root, "shots");
  for (const file of globSync("**/*.json", { cwd: shotsRoot })) {
    const id = file.replace(/\\/g, "/").slice(0, -5);
    if (!SHOT_ID.test(id)) continue;
    const png = join(shotsRoot, `${id}.png`);
    if (!existsSync(png)) continue;
    const bytes = readFileSync(join(shotsRoot, file));
    const meta: unknown = JSON.parse(bytes.toString());
    if (
      !isRecord(meta) ||
      typeof meta.width !== "number" ||
      typeof meta.height !== "number" ||
      meta.width <= 0 ||
      meta.height <= 0 ||
      !isRecord(meta.regions) ||
      !Object.values(meta.regions).every((r) =>
        validRegion(r, meta.width as number, meta.height as number),
      )
    )
      throw new Error(`ショットの領域が不正です: ${file}`);
    const shot = meta as unknown as StoryboardContext["shots"][string];
    context.shots[id] = shot;
    if (refs.has(`shot:${id}`)) {
      images[`shot:${id}`] = { ...shot, url: pathToFileURL(png).href };
      hashes[`shot:${id}`] = digest(bytes, readFileSync(png));
    }
  }
  for (const [name, art] of Object.entries(parseVideoArt(sb.art))) {
    const png = join(topic, "assets/art", `${name}.png`);
    if (!existsSync(png)) continue;
    context.artFiles.add(name);
    if (!refs.has(`art:${name}`)) continue;
    const bytes = readFileSync(png);
    // PNG IHDR は固定位置。SVG や外部 URL は扱わない。
    if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
      throw new Error(`PNG ではありません: ${png}`);
    const width = bytes.readUInt32BE(16),
      height = bytes.readUInt32BE(20);
    images[`art:${name}`] = {
      url: pathToFileURL(png).href,
      width,
      height,
      regions: Object.fromEntries(
        Object.entries(art.regions ?? {}).map(([id, r]) => [
          id,
          [r[0] * width, r[1] * height, r[2] * width, r[3] * height],
        ]),
      ),
    };
    hashes[`art:${name}`] = digest(bytes);
  }
  return { context, images, hashes, clips };
}

/** mark ごとに一度だけ取り出し、全場面で同じ画像列を使う。work は呼び出し側が finally で消す。 */
export async function extractClipFrames(
  root: string,
  work: string,
  assets: ReturnType<typeof storyboardAssets>,
) {
  for (const [ref, clip] of Object.entries(assets.clips)) {
    const parsed = clipReference(ref.slice(5));
    if (!parsed) continue;
    const [start, end] = clip.marks[parsed.mark];
    const count = Math.max(1, Math.ceil((end - start) * 30 - 1e-9));
    const dir = join(work, "clips", parsed.id, parsed.mark);
    mkdirSync(dir, { recursive: true });
    await runFfmpeg([
      "-ss",
      String(start),
      "-i",
      resolve(root, clip.video),
      "-vf",
      "fps=30",
      "-frames:v",
      String(count),
      "-q:v",
      "2",
      join(dir, "%06d.jpg"),
    ]);
    const frames = Array.from(
      { length: count },
      (_, i) => pathToFileURL(join(dir, `${String(i + 1).padStart(6, "0")}.jpg`)).href,
    );
    assets.images[ref].frames = frames;
    assets.images[ref].url = frames[0];
  }
}
