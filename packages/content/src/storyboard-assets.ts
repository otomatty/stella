import { createHash } from "node:crypto";
import { existsSync, globSync, readFileSync, openSync, readSync, closeSync } from "node:fs";
import { join } from "node:path";
import * as paths from "node:path";
import { pathToFileURL } from "node:url";
import type { ViewImage } from "./scene-view.js";
import { parseVideoArt } from "./video-art.js";
import { SHOT_ID, validRegion, isRecord } from "./video-shots.js";
import {
  clipReference,
  type ClipInfo,
  type StoryboardContext,
  type VideoStoryboard,
} from "./video-storyboard.js";

/** docs/devlab-ts-prework-guide/README.md の「公開先」。ブラウザーのアドレス欄用。 */
export const GUIDE_ADDRESSES: Record<string, string> = {
  "01": "claude.ai/artifact/7ZJi5iYUv8931w41FMt4jy",
  "02": "claude.ai/artifact/4wjk432sjZaGyASSenuS8X",
  "03": "claude.ai/artifact/JGMp5nvpXxY3RPCKwWJwzS",
  "04": "claude.ai/artifact/Ad8VaUe4rDUu25FMyB56Ur",
  "05": "claude.ai/artifact/Nbk1traThMM7bKy3Q4pjtV",
  "06": "claude.ai/artifact/1uw2AmJc5nri6JL3HzPnVz",
  "07": "claude.ai/artifact/Vjo1wZMtdrH9UM4RzJerYH",
  "08": "claude.ai/artifact/Jx9b63d3U6exjjNcGr5GFi",
  "09": "claude.ai/artifact/NbwTkaPZFmUV8fBN13aucz",
};
export function guideAddress(source: unknown): string {
  const chapter =
    typeof source === "string" ? /(?:^|\/)guide-(0[1-9])\.html$/.exec(source)?.[1] : undefined;
  if (!chapter) throw new Error(`ガイドの source から章を特定できません: ${String(source)}`);
  return GUIDE_ADDRESSES[chapter];
}

/** OS ごとの相対パスで、変更検知の対象内に収まることを確かめる。 */
export function clipVideoPath(root: string, input: string, id: string, path = paths): string {
  const video = path.resolve(root, input);
  const local = path.relative(path.resolve(root), video);
  if (
    path.isAbsolute(input) ||
    local === ".." ||
    local.startsWith(`..${path.sep}`) ||
    path.isAbsolute(local)
  )
    throw new Error(`クリップの動画は content 内の相対パスにしてください: ${id}`);
  if (!["stages", "clips"].some((dir) => local.startsWith(`${dir}${path.sep}`)))
    throw new Error(`クリップの動画は stages/ または clips/ の下に置いてください: ${id}`);
  return video;
}

// 大きい収録もメモリーへ丸ごと載せず、プロセス内で一度だけ読む。
const videoHashes = new Map<string, string>();
export function videoContentHash(file: string, fresh = false): string {
  const cached = videoHashes.get(file);
  if (cached && !fresh) return cached;
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
  options: {
    allowMissingClips?: boolean;
    onlyReferenced?: boolean;
    freshVideoHashes?: boolean;
  } = {},
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
    if (
      options.onlyReferenced &&
      ![...refs].some((ref) => ref.startsWith("clip:") && clipReference(ref.slice(5))?.id === id)
    )
      continue;
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
    const video = clipVideoPath(root, meta.video, id);
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
      images[ref] = {
        width: clip.width,
        height: clip.height,
        regions: clip.regions,
        url: "",
        ...(id.startsWith("guide/") ? { browserAddress: guideAddress(meta.source) } : {}),
      };
      clips[ref] = clip;
      hashes[ref] = digest(bytes, Buffer.from(videoContentHash(video, options.freshVideoHashes)));
    }
  }
  const shotsRoot = join(root, "shots");
  for (const file of globSync("**/*.json", { cwd: shotsRoot })) {
    const id = file.replace(/\\/g, "/").slice(0, -5);
    if (!SHOT_ID.test(id)) continue;
    if (options.onlyReferenced && !refs.has(`shot:${id}`)) continue;
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
