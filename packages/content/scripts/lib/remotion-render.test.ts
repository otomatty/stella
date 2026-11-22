import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { sceneTimelines } from "../../src/scene-timeline.js";
import type { MotionScene, VideoStoryboard } from "../../src/video-storyboard.js";
import {
  highlightedLines,
  motionSceneProps,
  remotionBrowser,
  remotionGenerationCode,
  runRemotion,
} from "./remotion-render.js";
import { sceneCacheHash, type SceneCacheInput, sceneVideoSourceHash } from "./scene-cache.js";

const execFile = vi.hoisted(() =>
  vi.fn<
    (
      command: string,
      args: string[],
      callback: (error: NodeJS.ErrnoException | null, stdout: string, stderr: string) => void,
    ) => void
  >(),
);
vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  execFile,
}));

it("Node.js に JavaScript のファイルと入力だけを渡す", async () => {
  const request = {
    action: "bundle",
    entryPoint: "/entry",
    rootDir: "/root",
    outDir: "/out",
  } as const;
  execFile.mockImplementationOnce((command, args, callback) => {
    expect(command).toBe("node");
    expect(args).toEqual([
      expect.stringMatching(/remotion-runtime\.mjs$/),
      expect.stringMatching(/request\.json$/),
    ]);
    expect(JSON.parse(readFileSync(args[1], "utf8"))).toEqual(request);
    callback(null, "", "");
  });
  await runRemotion(request);
});

it("Node.js が見つからなければ描画に必要だと案内する", async () => {
  execFile.mockImplementationOnce((_command, _args, callback) => {
    callback(Object.assign(new Error("spawn node ENOENT"), { code: "ENOENT" }), "", "");
  });
  await expect(
    runRemotion({ action: "bundle", entryPoint: "/entry", rootDir: "/root", outDir: "/out" }),
  ).rejects.toThrow("Remotion の描画には Node.js が必要です");
});

it("環境変数、Playwright の最新版、システムの順にブラウザーを探す", () => {
  const root = mkdtempSync(join(tmpdir(), "stella-remotion-browser-"));
  try {
    const cache = join(root, "cache");
    const other = join(root, "other");
    const system = join(root, "system-shell");
    const makeShell = (base: string, rev: number) => {
      const dir = join(base, `chromium_headless_shell-${rev}`, "chrome-linux");
      mkdirSync(dir, { recursive: true });
      const executable = join(dir, "chrome-headless-shell");
      writeFileSync(executable, "");
      return executable;
    };
    makeShell(cache, 99);
    const latest = makeShell(cache, 100);
    const explicitCache = makeShell(other, 1);
    writeFileSync(system, "");
    expect(remotionBrowser({ STELLA_REMOTION_BROWSER: "/explicit" }, cache, system)).toBe(
      "/explicit",
    );
    expect(remotionBrowser({ PLAYWRIGHT_BROWSERS_PATH: other }, cache, system)).toBe(explicitCache);
    expect(remotionBrowser({}, cache, system)).toBe(latest);
    expect(remotionBrowser({}, join(root, "missing"), system)).toBe(system);
    expect(remotionBrowser({}, join(root, "missing"), join(root, "missing-shell"))).toBeUndefined();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("コードの文字列と色分けを改行や入れ子があっても保つ", () => {
  const code = `/* comment\ncontinued */\nconst s = \`<& \${42}\`;`;
  const lines = highlightedLines(code);
  expect(lines.map((line) => line.map(({ text }) => text).join("")).join("\n")).toBe(code);
  expect(lines[1]).toContainEqual({ text: "continued */", className: "hljs-comment" });
  expect(lines[2]).toContainEqual({ text: "42", className: "hljs-number" });
  expect(lines[2]).toContainEqual({ text: "`<& ", className: "hljs-string" });
});

it("入力と Remotion の実装・依存版をハッシュに含める", () => {
  const root = mkdtempSync(join(tmpdir(), "stella-remotion-hash-"));
  try {
    const remotion = join(root, "remotion");
    mkdirSync(join(remotion, "motions"), { recursive: true });
    const component = join(remotion, "motions", "test.tsx");
    const pkg = join(root, "package.json");
    writeFileSync(component, "first render");
    writeFileSync(pkg, JSON.stringify({ devDependencies: { gsap: "3.15.1" } }));
    const scene: MotionScene = {
      kind: "motion",
      id: "goal",
      role: "goal",
      title: "自動販売機",
      motion: "vending-change",
      beats: [
        { say: "受け取ります。" },
        { say: "値を引きました。" },
        { say: "これが値です。" },
        { say: "返します。" },
        { say: "関数です。" },
        { say: "コードを読みます。", dialog: { title: "関数", code: ["const n = 1;"] } },
      ],
    };
    const [timing] = sceneTimelines([scene], [[1, 1, 1, 1, 1, 1]], {}, 2);
    const motion = motionSceneProps(scene, timing, true);
    expect(motion.beats).toHaveLength(5);
    expect(motion.overlays).toHaveLength(1);
    const storyboard: VideoStoryboard = {
      schema: 2,
      brief: { goal: "", stuck: "", points: [], leaveOut: [] },
      scenes: [scene],
    };
    const code = remotionGenerationCode(remotion);
    const cache: SceneCacheInput = {
      schema: 2,
      version: 3,
      board: { cols: 1, rows: 1, nodes: [] },
      start: undefined,
      scene,
      timing,
      motion,
      voice: "fake",
      speeches: [],
      audio: [],
      sfx: [],
      code,
    };
    const source = {
      version: 3,
      storyboard,
      title: "",
      takeaway: "",
      readings: {},
      voice: "fake",
      assets: {},
      code,
    };
    const cacheHash = sceneCacheHash(cache);
    const sourceHash = sceneVideoSourceHash(source);
    expect(sceneCacheHash({ ...cache, motion: { ...motion, fadeFromBackground: false } })).not.toBe(
      cacheHash,
    );
    expect(
      sceneVideoSourceHash({
        ...source,
        storyboard: { ...storyboard, scenes: [{ ...scene, beats: scene.beats.slice(0, -1) }] },
      }),
    ).not.toBe(sourceHash);

    writeFileSync(component, "updated render");
    const changed = remotionGenerationCode(remotion);
    expect(sceneCacheHash({ ...cache, code: changed })).not.toBe(cacheHash);
    expect(sceneVideoSourceHash({ ...source, code: changed })).not.toBe(sourceHash);
    writeFileSync(component, "first render");
    writeFileSync(pkg, JSON.stringify({ devDependencies: { gsap: "3.16.0" } }));
    const upgraded = remotionGenerationCode(remotion);
    expect(sceneCacheHash({ ...cache, code: upgraded })).not.toBe(cacheHash);
    expect(sceneVideoSourceHash({ ...source, code: upgraded })).not.toBe(sourceHash);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
