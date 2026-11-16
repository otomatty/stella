import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { storyboardAssets } from "../../src/storyboard-assets.js";
import { clipReference } from "../../src/video-storyboard.js";
import { runFfmpeg } from "./scene-encode.js";
export { storyboardAssets, videoContentHash } from "../../src/storyboard-assets.js";

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
