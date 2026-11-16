import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
import { afterEach, expect, it, vi } from "vitest";
import { encodeNarration } from "./ffmpeg.js";

vi.mock("node:child_process", () => ({
  spawn: vi.fn((_cmd: string, args: string[]) => {
    const child = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
    });
    queueMicrotask(() => {
      if (args.includes("null"))
        child.stderr.emit(
          "data",
          Buffer.from(
            JSON.stringify({
              input_i: "-20",
              input_tp: "-6",
              input_lra: "2",
              input_thresh: "-30",
              target_offset: "0",
            }),
          ),
        );
      child.emit("close", 0);
    });
    return child;
  }),
}));
afterEach(() => vi.clearAllMocks());

it("タイトルの無音は測定せず、同じ長さの固定ノイズだけを混ぜる", async () => {
  await encodeNarration("silent.wav", "title.m4a", { preventSilence: true, normalize: false });
  expect(spawn).toHaveBeenCalledTimes(1);
  const args = vi.mocked(spawn).mock.calls[0][1] as string[];
  const filter = args[args.indexOf("-filter_complex") + 1];
  expect(filter).not.toContain("loudnorm");
  expect(filter).toContain("[0:a]anull,aresample=48000[voice]");
  expect(filter).toContain("anoisesrc=r=48000:a=0.0018310546875:s=20261116:c=white");
  expect(filter).toContain("amix=inputs=2:duration=first:normalize=0");
});

it("通常の音声と旧方式は従来どおり2パスで正規化する", async () => {
  await encodeNarration("voice.wav", "voice.m4a");
  expect(spawn).toHaveBeenCalledTimes(2);
  const args = vi.mocked(spawn).mock.calls[1][1] as string[];
  expect(args).toContain("-af");
  expect(args[args.indexOf("-af") + 1]).toContain("loudnorm=I=-16:TP=-3:LRA=11:measured_I=-20");
  expect(args.join(" ")).not.toContain("anoisesrc");
  expect(args.filter((arg) => arg === "-i")).toHaveLength(1);
  expect(args.join(" ")).not.toContain("amix");
});

it.each([true, false])(
  "効果音は読み上げの正規化後に混ぜ、音量を下げない (ノイズ%s)",
  async (preventSilence) => {
    await encodeNarration("voice.wav", "mix.m4a", { preventSilence, sfxWav: "sfx.wav" });
    expect(spawn).toHaveBeenCalledTimes(2);
    const measure = vi.mocked(spawn).mock.calls[0][1] as string[];
    expect(measure).not.toContain("sfx.wav");
    const args = vi.mocked(spawn).mock.calls[1][1] as string[];
    expect(args.slice(args.indexOf("-i"), args.indexOf("-i") + 4)).toEqual([
      "-i",
      "voice.wav",
      "-i",
      "sfx.wav",
    ]);
    const filter = args[args.indexOf("-filter_complex") + 1];
    expect(filter).toContain("[0:a]loudnorm=");
    expect(filter).toContain("[1:a]aresample=48000[sfx]");
    expect(filter).toContain(
      `[voice]${preventSilence ? "[noise]" : ""}[sfx]amix=inputs=${preventSilence ? 3 : 2}:duration=first:normalize=0[out]`,
    );
    expect(filter.match(/loudnorm/g)).toHaveLength(1);
  },
);
