/**
 * 教材動画の音声・映像の書き出し (設計書の ②後処理 / ⑤ 書き出し)。ffmpeg を子プロセスで呼ぶ。
 *
 * - 字幕ごとの音声: 前後の無音を削り (-45 dB、前後 0.05 秒残す)、48kHz mono の PCM にする
 * - ナレーション: timeline の時刻に PCM を置いて 1 本にし、loudnorm で -16 LUFS にそろえて AAC へ
 * - 映像: スライドの静止画を区間ごとに H.264 にして concat でつなぎ、音声を載せる
 */

import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

export const AUDIO_RATE = 48_000;
/**
 * 映像はスライドの静止画の切り替えだけなので 10fps で足りる。PoC の実測で 30fps より
 * 符号化が約 3 倍速く、ファイルも約半分 (26 秒の区間: 30fps 8.4 秒 / 10fps 3.1 秒)。
 */
export const VIDEO_FPS = 10;

/** 無音削り: 頭を削る → 反転 → (元の末尾を) 削る → 戻す。途中の間は残す。 */
const TRIM_SILENCE =
  "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05," +
  "areverse," +
  "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05," +
  "areverse";

interface RunResult {
  stdout: Buffer;
  stderr: string;
}

function run(cmd: string, args: string[]): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (d: Buffer) => out.push(d));
    child.stderr.on("data", (d: Buffer) => err.push(d));
    child.on("error", (e) =>
      reject(
        new Error(
          `${cmd} を起動できません (${e.message})。ffmpeg を入れてください (apt install ffmpeg)`,
        ),
      ),
    );
    child.on("close", (code) => {
      const stderr = Buffer.concat(err).toString();
      if (code !== 0) {
        reject(new Error(`${cmd} ${args.slice(0, 6).join(" ")} … failed: ${stderr.slice(-800)}`));
        return;
      }
      resolve({ stdout: Buffer.concat(out), stderr });
    });
  });
}

const ffmpeg = (args: string[]) => run("ffmpeg", ["-hide_banner", "-nostdin", "-y", ...args]);

export async function ffmpegVersion(): Promise<string> {
  const { stdout } = await run("ffmpeg", ["-hide_banner", "-version"]);
  return stdout.toString().split("\n")[0] ?? "unknown";
}

/** 字幕 1 つの音声を、無音を削った 48kHz mono 16bit の PCM にする。 */
export async function decodeTrimmedPcm(file: string): Promise<Int16Array> {
  const { stdout } = await ffmpeg([
    "-loglevel",
    "error",
    "-i",
    file,
    "-af",
    TRIM_SILENCE,
    "-ac",
    "1",
    "-ar",
    String(AUDIO_RATE),
    "-f",
    "s16le",
    "pipe:1",
  ]);
  return new Int16Array(stdout.buffer, stdout.byteOffset, Math.floor(stdout.length / 2));
}

/** 字幕ごとの PCM を開始時刻 (秒) に置き、全体の長さの 1 本の WAV にする (サンプル単位で正確)。 */
export function writeNarrationWav(
  file: string,
  totalSec: number,
  placements: { startSec: number; pcm: Int16Array }[],
): void {
  const total = Math.ceil(totalSec * AUDIO_RATE);
  const mix = new Int16Array(total);
  for (const { startSec, pcm } of placements) {
    const offset = Math.round(startSec * AUDIO_RATE);
    mix.set(pcm.subarray(0, Math.max(0, Math.min(pcm.length, total - offset))), offset);
  }
  const data = Buffer.from(mix.buffer, mix.byteOffset, mix.byteLength);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(AUDIO_RATE, 24);
  header.writeUInt32LE(AUDIO_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([header, data]));
}

export interface Loudness {
  integratedLufs: number;
  truePeakDb: number;
}

/**
 * loudnorm の 2 パスで -16 LUFS にそろえ、AAC-LC 128kbps にする。
 * 1 回目で測った値を渡して線形モードで当てる。ピークの上限は品質基準 (-1.5 dBTP) より
 * 低い -3 dBTP で掛ける — AAC に変換するとピークが 0.5〜1 dB ほど上がるため
 * (PoC で -1.5 指定のまま変換すると -0.84〜-1.38 dBTP になった)。
 */
export async function encodeNarration(wav: string, m4a: string): Promise<void> {
  const m = await measureLoudnessRaw(wav);
  const filter =
    "loudnorm=I=-16:TP=-3:LRA=11" +
    `:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
    `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  await ffmpeg([
    "-loglevel",
    "error",
    "-i",
    wav,
    "-af",
    filter,
    "-ar",
    String(AUDIO_RATE),
    "-ac",
    "1",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    m4a,
  ]);
}

interface LoudnormMeasure {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
}

async function measureLoudnessRaw(file: string): Promise<LoudnormMeasure> {
  const { stderr } = await ffmpeg([
    "-loglevel",
    "info",
    "-i",
    file,
    "-af",
    "loudnorm=I=-16:TP=-3:LRA=11:print_format=json",
    "-f",
    "null",
    "-",
  ]);
  const json = /\{[\s\S]*"input_i"[\s\S]*?\}/.exec(stderr)?.[0];
  if (!json) throw new Error("loudnorm の測定結果が読めません");
  return JSON.parse(json) as LoudnormMeasure;
}

/** 書き出した音声のラウドネスを測る (品質チェック用)。 */
export async function measureLoudness(file: string): Promise<Loudness> {
  const m = await measureLoudnessRaw(file);
  return { integratedLufs: Number(m.input_i), truePeakDb: Number(m.input_tp) };
}

/**
 * 静止画 1 枚をフレーム数ぶんの H.264 区間にする。全区間を同じ設定で作るので、
 * concat demuxer で再圧縮せずにつなげる。区間の頭はキーフレームになる
 * (スライド頭へのシークが正確)。
 */
export async function encodeStill(png: string, frames: number, out: string): Promise<void> {
  await ffmpeg([
    "-loglevel",
    "error",
    "-loop",
    "1",
    "-framerate",
    String(VIDEO_FPS),
    "-i",
    png,
    "-frames:v",
    String(frames),
    "-c:v",
    "libx264",
    "-tune",
    "stillimage",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(VIDEO_FPS),
    "-video_track_timescale",
    "15360",
    out,
  ]);
}

/** 区間をつないで音声を載せ、faststart の MP4 にする。 */
export async function concatAndMux(
  segments: string[],
  listFile: string,
  audio: string,
  out: string,
): Promise<void> {
  writeFileSync(listFile, segments.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join("\n"));
  await ffmpeg([
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listFile,
    "-i",
    audio,
    "-map",
    "0:v",
    "-map",
    "1:a",
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    out,
  ]);
}

/** サムネイル用に PNG を 1280 幅の JPEG にする。 */
export async function toPosterJpeg(png: string, out: string): Promise<void> {
  await ffmpeg(["-loglevel", "error", "-i", png, "-vf", "scale=1280:-2", "-q:v", "3", out]);
}

/** 書き出した動画の長さ (秒)。 */
export async function probeDuration(file: string): Promise<number> {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=nw=1:nk=1",
    file,
  ]);
  return Number(stdout.toString().trim());
}
