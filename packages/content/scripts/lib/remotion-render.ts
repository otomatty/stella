import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  existsSync,
  globSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ChromiumOptions } from "@remotion/renderer";
import {
  MOTION_COMPOSITION_ID,
  type BeatOverlay,
  type CodeToken,
  type MotionSceneProps,
  VIDEO_FPS,
} from "../../remotion/lib/props.js";
import { codeColorsCss, dialogFontSize } from "../../src/scene-overlays.js";
import type { SceneTimeline } from "../../src/scene-timeline.js";
import type { MotionScene } from "../../src/video-storyboard.js";
import { highlightCode } from "./scene-code-html.js";
import type { SceneFrames } from "./scene-encode.js";

export type RemotionRequest =
  | { action: "bundle"; entryPoint: string; rootDir: string; outDir: string }
  | ({
      serveUrl: string;
      id: string;
      inputProps: MotionSceneProps;
      browserExecutable?: string;
      chromiumOptions: ChromiumOptions;
      output: string;
    } & ({ action: "frames" } | { action: "still"; frame: number }));

const require = createRequire(import.meta.url);
const motionRoot = fileURLToPath(new URL("../../remotion/", import.meta.url));

export function remotionGenerationCode(root = motionRoot): Record<string, string> {
  const { devDependencies } = JSON.parse(readFileSync(join(root, "../package.json"), "utf8")) as {
    devDependencies: Record<string, string>;
  };
  const names = [
    "remotion",
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/cli",
    "gsap",
    "react",
    "react-dom",
  ];
  const versions = Object.fromEntries(names.map((name) => [name, devDependencies[name]]));
  return {
    remotionVersions: JSON.stringify(versions),
    ...Object.fromEntries(
      readdirSync(root, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => {
          const path = join(entry.parentPath, entry.name);
          return [
            `remotion/${relative(root, path).replaceAll("\\", "/")}`,
            createHash("sha256").update(readFileSync(path)).digest("hex"),
          ];
        }),
    ),
  };
}

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#x27": "'" };

const coloredClasses = new Set(codeColorsCss.match(/(?<=\.)[\w-]+/g));

/** highlight.js の span とエスケープ済みテキストを、行ごとのデータに戻す。 */
export function highlightedLines(code: string): CodeToken[][] {
  const lines: CodeToken[][] = [[]];
  const classes: string[] = [];
  for (const match of highlightCode(code).matchAll(/<span class="([^"]+)">|<\/span>|[^<]+/g)) {
    if (match[1]) classes.push(match[1]);
    else if (match[0] === "</span>") classes.pop();
    else {
      const className = classes.findLast((names) =>
        names.split(" ").some((name) => coloredClasses.has(name)),
      );
      const segments = match[0]
        .replace(/&(amp|lt|gt|quot|#x27);/g, (_, key: string) => entities[key])
        .split("\n");
      for (const [i, text] of segments.entries()) {
        if (i > 0) lines.push([]);
        if (text) lines[lines.length - 1].push(className ? { text, className } : { text });
      }
    }
  }
  return lines;
}

export function motionSceneProps(
  scene: MotionScene,
  timing: SceneTimeline,
  fadeFromBackground: boolean,
): MotionSceneProps {
  const beats: MotionSceneProps["beats"] = [];
  const overlays: BeatOverlay[] = [];
  for (const [i, { term, dialog }] of scene.beats.entries()) {
    const { start, end } = timing.beats[i];
    if (term) overlays.push({ start, end, term });
    else if (dialog)
      overlays.push({
        start,
        end,
        dialog: {
          title: dialog.title,
          fontSize: dialogFontSize(dialog.code),
          lines: highlightedLines(dialog.code.join("\n")),
        },
      });
    else beats.push({ start, end });
  }
  return {
    motion: scene.motion,
    beats,
    overlays,
    duration: timing.duration,
    durationInFrames: Math.round(timing.duration * VIDEO_FPS),
    fadeFromBackground,
    ...(timing.think ? { think: timing.think } : {}),
  };
}

export function remotionBrowser(
  env = process.env,
  playwrightCache = join(homedir(), ".cache/ms-playwright"),
  systemShell = "/opt/pw-browsers/chromium_headless_shell",
): string | undefined {
  if (env.STELLA_REMOTION_BROWSER) return env.STELLA_REMOTION_BROWSER;
  const cache =
    env.PLAYWRIGHT_BROWSERS_PATH === "0"
      ? join(
          dirname(
            createRequire(require.resolve("playwright/package.json")).resolve(
              "playwright-core/package.json",
            ),
          ),
          ".local-browsers",
        )
      : resolve(env.PLAYWRIGHT_BROWSERS_PATH || playwrightCache);
  if (existsSync(cache)) {
    const shells = globSync("chromium_headless_shell-*/**/chrome-headless-shell", { cwd: cache });
    shells.sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
    const shell = shells.find((path) => existsSync(join(cache, path)));
    if (shell) return join(cache, shell);
  }
  return existsSync(systemShell) ? systemShell : undefined;
}

const glModes = ["swangle", "angle", "egl", "swiftshader", "vulkan", "angle-egl"] as const;
function chromiumOptions(): ChromiumOptions {
  const requested = process.env.STELLA_REMOTION_GL;
  const gl = requested ? glModes.find((mode) => mode === requested) : undefined;
  if (requested && !gl)
    throw new Error(`STELLA_REMOTION_GL: ${glModes.join("・")}から選んでください`);
  return { gl: gl ?? (process.platform === "linux" ? "swangle" : undefined) };
}

/** esbuild のサービスと Chromium は Node.js で実行する。 */
export async function runRemotion(request: RemotionRequest): Promise<void> {
  const script = fileURLToPath(new URL("./remotion-runtime.mjs", import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), "stella-remotion-request-"));
  try {
    const input = join(dir, "request.json");
    writeFileSync(input, JSON.stringify(request));
    await new Promise<void>((done, fail) => {
      execFile("node", [script, input], (error, _, stderr) => {
        if (error) {
          const message =
            error.code === "ENOENT"
              ? "Remotion の描画には Node.js が必要です"
              : stderr.trim() || error.message;
          fail(new Error(message, { cause: error }));
        } else done();
      });
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

let bundlePromise: Promise<string> | undefined;
async function bundleMotion(): Promise<string> {
  const outDir = mkdtempSync(join(tmpdir(), "stella-remotion-"));
  const clean = () => rmSync(outDir, { recursive: true, force: true });
  try {
    await runRemotion({
      action: "bundle",
      entryPoint: join(motionRoot, "index.ts"),
      rootDir: resolve(motionRoot, ".."),
      outDir,
    });
  } catch (error) {
    clean();
    bundlePromise = undefined;
    throw error;
  }
  process.once("exit", clean);
  return outDir;
}

async function renderOptions(inputProps: MotionSceneProps, output: string) {
  bundlePromise ??= bundleMotion();
  return {
    serveUrl: await bundlePromise,
    id: MOTION_COMPOSITION_ID,
    inputProps,
    browserExecutable: remotionBrowser(),
    chromiumOptions: chromiumOptions(),
    output,
  };
}

export async function renderMotionFrames(
  props: MotionSceneProps,
  work: string,
): Promise<SceneFrames> {
  await runRemotion({ ...(await renderOptions(props, work)), action: "frames" });
  const frames = readdirSync(work)
    .flatMap((name) => {
      const match = /^frame-(\d+)\.jpe?g$/.exec(name);
      return match ? [{ number: Number(match[1]), file: join(work, name) }] : [];
    })
    .sort((a, b) => a.number - b.number);
  if (frames.length !== props.durationInFrames || frames.some((frame, i) => frame.number !== i))
    throw new Error("Remotion の連番画像が揃っていません");
  return frames.map(({ file }) => ({ file, frames: 1 }));
}

export async function renderMotionStill(
  props: MotionSceneProps,
  time: number,
  output: string,
): Promise<void> {
  await runRemotion({
    ...(await renderOptions(props, output)),
    action: "still",
    frame: Math.max(0, Math.min(props.durationInFrames - 1, Math.round(time * VIDEO_FPS))),
  });
}
