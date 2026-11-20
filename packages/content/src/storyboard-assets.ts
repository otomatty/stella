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

function clipBrowser(id: string, meta: Record<string, unknown>) {
  if (!Object.hasOwn(meta, "browser")) return undefined;
  if (!id.startsWith("web/")) throw new Error(`browser は web のクリップだけに書けます: ${id}`);
  const browser = meta.browser;
  if (
    !isRecord(browser) ||
    typeof browser.tab !== "string" ||
    browser.tab.length < 1 ||
    browser.tab.length > 20 ||
    /[\r\n]/.test(browser.tab) ||
    typeof browser.address !== "string" ||
    browser.address.length < 1 ||
    browser.address.length > 70 ||
    /[\r\n]/.test(browser.address)
  )
    throw new Error(`クリップの browser が不正です: ${id}`);
  return { tab: browser.tab, address: browser.address };
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
    const browser = clipBrowser(id, meta as Record<string, unknown>);
    const clip = meta as unknown as ClipInfo;
    if (browser) clip.browser = browser;
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
        ...(clip.browser ? { browser: clip.browser } : {}),
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
