import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { clipMetadata, type Marks, type Regions } from "./clips";

const execute = promisify(execFile);
const repoRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
export async function writeClip(
  output: string,
  video: string,
  id: string,
  source: string,
  marks: Marks,
  regions: Regions,
) {
  const { stdout } = await execute("ffprobe", [
    "-v",
    "error",
    "-show_streams",
    "-show_format",
    "-of",
    "json",
    video,
  ]);
  const probe = JSON.parse(stdout);
  const streams = probe.streams;
  const stream = streams?.[0];
  if (
    streams?.length !== 1 ||
    stream?.codec_type !== "video" ||
    stream.codec_name !== "h264" ||
    stream.pix_fmt !== "yuv420p" ||
    stream.width !== 1600 ||
    stream.height !== 1000
  )
    throw new Error("動画は音声なしの H.264 / yuv420p / 1600×1000 にしてください");
  const rate = (value: string) => {
    const [n, d] = value.split("/").map(Number);
    return n / d;
  };
  const fps = rate(stream.avg_frame_rate);
  if (rate(stream.r_frame_rate) !== 30) throw new Error("動画は固定 30fps にしてください");
  const metadata = clipMetadata(id, source, Number(probe.format.duration), fps, marks, regions);
  const destination = path.join(output, id);
  await mkdir(path.dirname(destination), { recursive: true });
  const stage = await mkdtemp(path.join(path.dirname(destination), ".clip-"));
  try {
    await copyFile(video, path.join(stage, "video.mp4"));
    await writeFile(path.join(stage, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n");
    await rename(path.join(stage, "video.mp4"), `${destination}.mp4`);
    const file = `${destination}.json`;
    await rename(path.join(stage, "metadata.json"), file);
    try {
      await execute(path.join(repoRoot, "node_modules/.bin/biome"), ["format", "--write", file], {
        cwd: repoRoot,
        shell: false,
      });
    } catch {
      console.warn(`${file}: Biome で整形できませんでした。bun run lint の前に整形してください`);
    }
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}
