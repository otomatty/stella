import { createHash } from "node:crypto";
import { existsSync, globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ViewImage } from "../../src/scene-view.js";
import { parseVideoArt } from "../../src/video-art.js";
import { SHOT_ID, validRegion, isRecord } from "../../src/video-shots.js";
import type { StoryboardContext, VideoStoryboard } from "../../src/video-storyboard.js";

/** ファイルの読み込みは検査の純関数から分ける。使う素材だけをキャッシュへ含める。 */
export function storyboardAssets(root: string, topic: string, json: unknown) {
  const context: StoryboardContext = { shots: {}, artFiles: new Set() };
  const images: Record<string, ViewImage> = {};
  const hashes: Record<string, string> = {};
  const sb = json as VideoStoryboard;
  const refs = new Set<string>();
  for (const scene of sb.scenes ?? []) {
    if (scene.kind === "view") {
      refs.add(scene.image);
      for (const b of scene.beats ?? []) if (b.image) refs.add(b.image);
    }
  }
  for (const board of Object.values(sb.boards ?? {}))
    for (const node of board.nodes ?? []) if (node.art) refs.add(`art:${node.art}`);
  const digest = (...bytes: Uint8Array[]) => {
    const h = createHash("sha256");
    for (const b of bytes) h.update(b);
    return h.digest("hex");
  };
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
  return { context, images, hashes };
}
