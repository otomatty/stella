import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isRecord, validateFrames, type VideoInfo } from "../src/video-shots";

const run = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
async function main() {
  const input: unknown = JSON.parse(await readFile(join(root, "shots/frames.json"), "utf8"));
  const videos: Record<string, VideoInfo> = Object.create(null);
  const errors: string[] = [];
  const paths = Array.isArray(input)
    ? [
        ...new Set(
          input
            .filter(isRecord)
            .map((v) => v.video)
            .filter((v): v is string => typeof v === "string"),
        ),
      ]
    : [];
  for (const video of paths) {
    const file = resolve(root, video);
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep) || !existsSync(file)) continue;
    try {
      const { stdout } = await run("ffprobe", [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,duration:format=duration",
        "-of",
        "json",
        file,
      ]);
      const data = JSON.parse(stdout);
      const stream = data.streams?.[0];
      const info = {
        width: Number(stream?.width),
        height: Number(stream?.height),
        duration: Number(stream?.duration ?? data.format?.duration),
      };
      if (!Object.values(info).every((n) => Number.isFinite(n) && n > 0))
        throw new Error("動画の長さ・画像サイズが不明です");
      videos[video] = info;
    } catch (e) {
      errors.push(`${video}: 動画の情報を取得できません (${(e as Error).message})`);
    }
  }
  const checked = validateFrames(input, videos);
  errors.push(...checked.errors);
  const ids = process.argv.slice(2).filter((a) => a !== "--");
  for (const id of ids)
    if (!checked.frames.some((f) => f.id === id) && !checked.errors.length)
      errors.push(`id「${id}」の定義がありません`);
  if (errors.length) throw new Error(errors.join("\n"));
  for (const frame of checked.frames.filter((f) => !ids.length || ids.includes(f.id))) {
    const output = join(root, "shots", frame.id);
    const temp = `${output}.pending.png`;
    try {
      await mkdir(dirname(output), { recursive: true });
      await run("ffmpeg", [
        "-hide_banner",
        "-nostdin",
        "-y",
        "-loglevel",
        "error",
        "-ss",
        String(frame.at),
        "-i",
        resolve(root, frame.video),
        "-frames:v",
        "1",
        temp,
      ]);
      const png = await readFile(temp);
      if (png.length < 24 || png.toString("ascii", 1, 4) !== "PNG")
        throw new Error("PNG を取り出せませんでした");
      const width = png.readUInt32BE(16),
        height = png.readUInt32BE(20);
      if (width !== videos[frame.video].width || height !== videos[frame.video].height)
        throw new Error("動画と PNG のサイズが一致しません");
      await rename(temp, `${output}.png`);
      await writeFile(
        `${output}.json`,
        JSON.stringify(
          { source: `${frame.video}@${frame.at}`, width, height, regions: frame.regions },
          null,
          2,
        ).replace(/\[\s+(\d+),\s+(\d+),\s+(\d+),\s+(\d+)\s+\]/g, "[$1, $2, $3, $4]") + "\n",
      );
      console.log(`作成しました: ${frame.id}`);
    } catch (e) {
      errors.push(`${frame.id}: ${(e as Error).message}`);
    } finally {
      await rm(temp, { force: true });
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
}
main().catch((e) => {
  console.error(`ショットを作成できませんでした:\n${e.message}`);
  process.exitCode = 1;
});
