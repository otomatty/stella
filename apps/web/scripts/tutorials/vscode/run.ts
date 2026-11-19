import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { _electron, type ElectronApplication, type Page } from "playwright";
import { readEnvironment } from "../../../../../packages/content/src/task-content";
import {
  parseTaskDefinition,
  toRuntimeManifest,
} from "../../../../../packages/content/src/task-schema";
import { buildVscodeTaskUri } from "../../../../../packages/shared/src/vscode/uris";
import { writeClip } from "../lib/clip-output";
import { jwtSecret, mintToken, TutorialEnvironment } from "../lib/environment";
import { clipMetadata, type Regions } from "../lib/clips";
import { recordingOptions, selectsScenario } from "./options";
import { chaptersToVtt } from "../lib/captions";
import { Director, PARK } from "../lib/director";
import { collectNarrationTexts, muxNarration, Narrator, titleNarration } from "../lib/narration";
import { overlayScript } from "../lib/overlay";
import { ScreenRecorder } from "../lib/recorder";
import {
  assertScenario,
  bareProfile,
  closeNotifications,
  recordedRegion,
  webviewBody,
  type Scenario,
  type TaskContext,
} from "./helpers";
import { saveRecording } from "./save-recording";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../../..");
const TEMP = path.join(os.tmpdir(), "stella-tutorials");
const BASE = path.join(TEMP, "vscode");
const HOME_DIR = path.join(BASE, "home");
const WORK = path.join(BASE, "work");
const OUT = path.join(BASE, "out");
const USER_DATA = path.join(BASE, "profile", "user-data");
const EXTENSIONS = path.join(BASE, "profile", "exts");
const EXTENSION = path.join(ROOT, "apps", "vscode");
const FILE_MENU = '.menubar-menu-button[aria-label="ファイル"]';

async function resolveTopic(topic: string) {
  const stages = await realpath(path.join(ROOT, "packages", "content", "stages"));
  const destination = path.resolve(stages, topic);
  if (!destination.startsWith(`${stages}${path.sep}`)) {
    throw new Error("topic は packages/content/stages 内のフォルダーを指定してください");
  }
  if (!existsSync(path.join(destination, "slides.md"))) {
    throw new Error(`topic に slides.md がありません: ${topic}`);
  }
  const resolved = await realpath(destination);
  if (!resolved.startsWith(`${stages}${path.sep}`)) {
    throw new Error("topic の実体は packages/content/stages 内に置いてください");
  }
  return resolved;
}

function run(command: string, args: string[], env = process.env): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: "ignore", windowsHide: true });
    child.on("error", () => reject(new Error(`${path.basename(command)} を起動できませんでした`)));
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${path.basename(command)} が終了コード ${code} で失敗しました`)),
    );
  });
}

interface LmsSession {
  apiBase: string;
  webBase: string;
  token: string;
}

async function resolveCli(executable: string): Promise<string> {
  // code.cmd の版つき cli.js のパスだけ読み取り、バッチ自体は実行しない。
  const cmdPath = path.join(path.dirname(executable), "bin", "code.cmd");
  const cmd = await readFile(cmdPath, "utf8");
  const cliReference = /"(%~dp0[^"\r\n]*[\\/]cli\.js)"/i.exec(cmd)?.[1];
  if (!cliReference) throw new Error(`${cmdPath} から cli.js の場所を読み取れませんでした`);
  const cli = path.resolve(path.dirname(cmdPath), cliReference.slice(5));
  if (!existsSync(cli)) throw new Error(`VS Code の cli.js が見つかりません: ${cli}`);
  return cli;
}

async function writeUserSettings(
  urls?: { serverUrl: string; webUrl: string },
  userData = USER_DATA,
) {
  await mkdir(path.join(userData, "User"), { recursive: true });
  await writeFile(
    path.join(userData, "User", "settings.json"),
    JSON.stringify(
      {
        "workbench.startupEditor": "none",
        "workbench.secondarySideBar.defaultVisibility": "hidden",
        "workbench.hover.delay": 60000,
        // README のテキストを閉じても、左の編集欄と右の課題文の配置を保つ。
        "workbench.editor.closeEmptyGroups": false,
        "chat.disableAIFeatures": true,
        "telemetry.telemetryLevel": "off",
        "update.mode": "none",
        "extensions.autoUpdate": false,
        "security.workspace.trust.enabled": false,
        "files.hotExit": "off",
        "window.restoreWindows": "none",
        "editor.fontSize": 16,
        ...(urls ? { "stella.serverUrl": urls.serverUrl, "stella.webUrl": urls.webUrl } : {}),
      },
      null,
      2,
    ) + "\n",
  );
}

async function prepareProfile(
  executable: string,
  userData = USER_DATA,
  extensions = EXTENSIONS,
  home?: string,
) {
  await writeUserSettings(undefined, userData);
  await mkdir(extensions, { recursive: true });
  const installed = (await readdir(extensions, { withFileTypes: true })).some(
    (entry) =>
      entry.isDirectory() &&
      entry.name.toLowerCase().startsWith("ms-ceintl.vscode-language-pack-ja-"),
  );
  if (installed) return;

  const cli = await resolveCli(executable);
  console.log("[tutorials:vscode] 日本語の言語パックを準備しています");
  await run(
    executable,
    [
      cli,
      "--user-data-dir",
      userData,
      "--extensions-dir",
      extensions,
      "--install-extension",
      "MS-CEINTL.vscode-language-pack-ja",
    ],
    {
      ...process.env,
      ...(home ? { USERPROFILE: home, HOME: home } : {}),
      VSCODE_DEV: "",
      ELECTRON_RUN_AS_NODE: "1",
    },
  );
}

async function prepareTask(s: Scenario) {
  assertScenario(s);
  if (!s.task) throw new Error("台本に topic と task が必要です");
  const tasks = [...new Set([s.task, ...(s.others ?? [])])];
  const workDir = path.resolve(WORK, s.id);
  // 作り直す場所が、この収録の一時ディレクトリ直下であることを確かめる。
  if (path.dirname(workDir) !== path.resolve(WORK)) throw new Error("課題の作業場所が不正です");
  await rm(workDir, { recursive: true, force: true });
  const trainingRoot = path.join(workDir, "web-training");
  const taskRoot = path.join(trainingRoot, s.task);
  const contentRoot = path.join(ROOT, "packages", "content");
  for (const taskId of tasks) {
    const [stage, unit, task] = taskId.split("/");
    const source = path.join(contentRoot, "stages", stage, "modules", unit, "tasks", task);
    const destination = path.join(trainingRoot, taskId);
    await mkdir(path.join(destination, ".stella"), { recursive: true });
    await cp(path.join(source, "README.md"), path.join(destination, "README.md"));
    await cp(path.join(source, "starter"), destination, {
      recursive: true,
      filter: (file) => path.basename(file) !== ".gitkeep",
    });
    await cp(path.join(source, "tests"), path.join(destination, "tests"), { recursive: true });
    const raw = JSON.parse(await readFile(path.join(source, "task.json"), "utf8"));
    const environment = readEnvironment(contentRoot, raw.environment);
    const manifest = toRuntimeManifest(parseTaskDefinition(raw, environment), environment);
    await writeFile(
      path.join(destination, ".stella", "task.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );
  }
  await s.prepare?.({
    taskRoot,
    trainingRoot,
    region: async () => {
      throw new Error("領域は収録中の画面から取ってください");
    },
  });
  return { workDir, trainingRoot, taskRoot };
}

async function finishWindow(page: Page, clip: boolean) {
  await page.evaluate(
    `var __name = (f) => f; (${overlayScript.toString()})(${JSON.stringify({ accent: "#6470e8", clip })});`,
  );
  await page.evaluate(() => {
    const root = document.getElementById("__tutor_host")?.shadowRoot;
    if (!root) throw new Error("収録用のオーバーレイが見つかりません");
    // レッスンでは VTT の字幕を表示するため、操作の字幕帯だけ焼き込まない。
    const style = document.createElement("style");
    style.textContent = ".caption { display: none !important; }";
    root.appendChild(style);
  });
  await page.mouse.move(PARK.x, PARK.y);
}

async function recreateWorkDir(id: string): Promise<string> {
  const workDir = path.resolve(WORK, id);
  if (path.dirname(workDir) !== path.resolve(WORK)) throw new Error("課題の作業場所が不正です");
  await rm(workDir, { recursive: true, force: true });
  await mkdir(workDir, { recursive: true });
  return workDir;
}

async function resetLmsTrainingRoot(): Promise<string> {
  const trainingRoot = path.resolve(HOME_DIR, "web-training");
  const home = path.resolve(HOME_DIR);
  const base = path.resolve(BASE);
  if (path.dirname(trainingRoot) !== home || !trainingRoot.startsWith(`${base}${path.sep}`)) {
    throw new Error("学習フォルダーの場所が不正です");
  }
  await rm(trainingRoot, { recursive: true, force: true });
  await mkdir(trainingRoot, { recursive: true });
  return trainingRoot;
}

async function prepareLmsWindow(page: Page, s: Scenario, executable: string, ctx: TaskContext) {
  // 下準備: 録画の前に URI の許可を済ませる。拡張の起動が遅いと通知が録画に残るので、出るまで待って消す。
  await openUri(page, executable, "vscode://saedgewell.stella-lms/lesson", { confirm: true });
  const toast = page
    .locator(".notifications-toasts .notification-toast")
    .filter({ hasText: "レッスン指定がありません" });
  const shown = await toast
    .first()
    .waitFor({ state: "visible", timeout: 60_000 })
    .then(
      () => true,
      () => false,
    );
  if (!shown) throw new Error("下準備の URI を拡張が処理しませんでした");
  await closeNotifications(page);
  await toast.first().waitFor({ state: "hidden", timeout: 5_000 });
  await s.setup?.(page, ctx);
  await closeNotifications(page);
  await page.keyboard.press("Escape");
  await finishWindow(page, Boolean(s.clip));
}

async function openUri(page: Page, executable: string, uri: string, options: { confirm: boolean }) {
  const cli = await resolveCli(executable);
  await run(
    executable,
    [cli, "--user-data-dir", USER_DATA, "--extensions-dir", EXTENSIONS, "--open-url", uri],
    {
      ...process.env,
      USERPROFILE: HOME_DIR,
      HOME: HOME_DIR,
      VSCODE_DEV: "",
      ELECTRON_RUN_AS_NODE: "1",
    },
  );
  if (!options.confirm) return;
  const dialog = page
    .locator(".monaco-dialog-box")
    .filter({ hasText: "URI を開くことを許可しますか" });
  const shown = await dialog.waitFor({ state: "visible", timeout: 5_000 }).then(
    () => true,
    () => false,
  );
  if (!shown) return;
  const toggle = dialog.locator(".monaco-custom-toggle").first();
  const checkbox = dialog.locator("input[type=checkbox]").first();
  if ((await toggle.count()) > 0) {
    if ((await toggle.getAttribute("aria-checked")) !== "true") await toggle.click();
  } else if ((await checkbox.count()) > 0) {
    await checkbox.check();
  } else {
    throw new Error("URI の許可ダイアログにチェックボックスがありません");
  }
  await dialog
    .locator(".monaco-button")
    .filter({ hasText: /^開く$/ })
    .click();
  await dialog.waitFor({ state: "hidden", timeout: 5_000 });
}

async function openRecordedTask(page: Page, s: Scenario, executable: string, session: LmsSession) {
  const response = await fetch(`${session.apiBase}/api/auth/vscode-link`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.token}` },
  });
  const body = (await response.json().catch(() => null)) as { code?: unknown } | null;
  const code = body?.code;
  if (!response.ok || typeof code !== "string" || code.length === 0) {
    throw new Error(`接続コードの発行に失敗しました (${response.status})`);
  }
  // 接続コードは URI に載る。ログや例外文には出さない。
  if (!s.task) throw new Error("台本に topic と task が必要です");
  await openUri(page, executable, buildVscodeTaskUri(s.task, code), { confirm: false });
}

async function prepareWindow(page: Page, s: Scenario, ctx: TaskContext, openFile: string) {
  const fileTab = page
    .locator(`.tabs-container .tab[aria-label^=${JSON.stringify(path.basename(openFile))}]`)
    .first();
  await fileTab.click();
  await page.locator('[id="saedgewell.stella-lms.stella.showTaskReadme"]').click();
  const readmeTab = page.locator('.tabs-container .tab[aria-label^="課題: "]');
  await readmeTab.waitFor({ state: "visible", timeout: 30_000 });
  await webviewBody(page).waitFor({ timeout: 30_000 });
  await fileTab.click();
  if (s.open === null) {
    await page.keyboard.press("Control+w");
    await fileTab.waitFor({ state: "detached" });
  } else {
    await page.locator(".monaco-editor .view-lines").first().click();
  }
  await s.setup?.(page, ctx);
  await closeNotifications(page);
  await page.keyboard.press("Escape");
  await finishWindow(page, Boolean(s.clip));
}

function assertInsideBase(target: string) {
  const resolved = path.resolve(target);
  const base = path.resolve(BASE);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`))
    throw new Error(`収録用の一時ディレクトリの外は消せません: ${target}`);
}

async function uninstallStella(
  executable: string,
  userData: string,
  extensions: string,
  home: string,
) {
  const cli = await resolveCli(executable);
  await new Promise<void>((resolve) => {
    const child = spawn(
      executable,
      [
        cli,
        "--user-data-dir",
        userData,
        "--extensions-dir",
        extensions,
        "--uninstall-extension",
        "saedgewell.stella-lms",
      ],
      {
        env: {
          ...process.env,
          USERPROFILE: home,
          HOME: home,
          VSCODE_DEV: "",
          ELECTRON_RUN_AS_NODE: "1",
        },
        stdio: "ignore",
        windowsHide: true,
      },
    );
    child.on("error", () => resolve());
    child.on("close", () => resolve());
  });
}

async function prepareBare(executable: string, lang: "ja" | "en") {
  const profile = bareProfile(lang);
  for (const dir of [profile.root, profile.userData, profile.exts, profile.home])
    assertInsideBase(dir);
  if (lang === "en") {
    await rm(profile.userData, { recursive: true, force: true });
    await rm(profile.exts, { recursive: true, force: true });
    await rm(profile.home, { recursive: true, force: true });
    await mkdir(profile.userData, { recursive: true });
    await mkdir(profile.exts, { recursive: true });
    await mkdir(profile.home, { recursive: true });
  } else {
    await mkdir(profile.home, { recursive: true });
    const entries = await readdir(profile.exts, { withFileTypes: true }).catch(() => []);
    const installed = entries.some(
      (entry) =>
        entry.isDirectory() &&
        entry.name.toLowerCase().startsWith("ms-ceintl.vscode-language-pack-ja-"),
    );
    if (!installed) await prepareProfile(executable, profile.userData, profile.exts, profile.home);
    await uninstallStella(executable, profile.userData, profile.exts, profile.home);
    for (const name of ["globalStorage", "workspaceStorage"]) {
      const storage = path.join(profile.userData, "User", name);
      assertInsideBase(storage);
      await rm(storage, { recursive: true, force: true });
    }
  }
  await writeUserSettings(
    { serverUrl: "http://127.0.0.1:9", webUrl: "http://127.0.0.1:9" },
    profile.userData,
  );
}

async function recordBare(
  s: Scenario,
  executable: string,
  narrator: Narrator | null,
  keepFrames: boolean,
  source: string,
) {
  if (s.bare !== "ja" && s.bare !== "en") throw new Error("bare は ja または en にしてください");
  const lang = s.bare;
  if (!s.clip) throw new Error("bare の台本には clip が必要です");
  const clipId = s.clip;
  await prepareBare(executable, lang);
  const workDir = await recreateWorkDir(s.id);
  const profile = bareProfile(lang);
  let app: ElectronApplication | undefined;
  let page: Page | undefined;
  let recorder: ScreenRecorder | undefined;
  const errorImage = path.join(WORK, `${s.id}-error.png`);
  const video = path.join(workDir, `${s.id}.mp4`);
  await rm(errorImage, { force: true });
  const captured: Regions = {};
  try {
    const attempts = lang === "ja" ? 2 : 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      app = await _electron.launch({
        executablePath: executable,
        args: [
          `--user-data-dir=${profile.userData}`,
          `--extensions-dir=${profile.exts}`,
          ...(lang === "ja" ? ["--locale=ja"] : []),
          "--skip-welcome",
          "--skip-release-notes",
          "--force-device-scale-factor=1.5",
        ],
        env: { ...process.env, USERPROFILE: profile.home, HOME: profile.home },
        bypassCSP: true,
        timeout: 60_000,
      });
      page = await app.firstWindow();
      const win = await app.browserWindow(page);
      await win.evaluate((w) => {
        w.unmaximize();
        w.setContentSize(1280, 800);
      });
      await page.waitForSelector(".monaco-workbench");
      const menu = lang === "ja" ? FILE_MENU : '.menubar-menu-button[aria-label="File"]';
      const ready = await page
        .locator(menu)
        .waitFor({ timeout: 10_000 })
        .then(
          () => true,
          () => false,
        );
      if (ready) break;
      if (lang === "en" || attempt === 1)
        throw new Error(
          lang === "ja"
            ? "VS Code が日本語で起動しませんでした"
            : "VS Code が英語で起動しませんでした",
        );
      await app.close();
      app = undefined;
      page = undefined;
    }
    if (!page) throw new Error("VS Code のウィンドウを開けませんでした");
    await s.setup?.(page, {
      taskRoot: workDir,
      trainingRoot: workDir,
      region: async () => {
        throw new Error("領域は収録中の画面から取ってください");
      },
    });
    await closeNotifications(page);
    await page.keyboard.press("Escape");
    await finishWindow(page, true);
    recorder = new ScreenRecorder(page, path.join(workDir, "frames"));
    const t = new Director(page, recorder, { narrator, clip: true });
    t.setMouse(PARK.x, PARK.y);
    console.log(`[tutorials:vscode] 収録中: ${s.title}`);
    await recorder.start();
    try {
      await s.run(t, {
        taskRoot: workDir,
        trainingRoot: workDir,
        page,
        region: async (name, target) => {
          captured[name] = recordedRegion(await target.boundingBox(), name);
        },
      });
      await t.finish();
      await t.hideCaption();
      await t.wait(700);
    } finally {
      await recorder.stop();
    }
    await recorder.encode(video, null, { width: 1600 });
    await writeClip(path.join(ROOT, "packages/content/clips"), video, clipId, source, t.marks, {
      ...s.regions,
      ...captured,
    });
    console.log(`[tutorials:vscode] クリップを保存しました: ${clipId}`);
  } catch (error) {
    if (page && !page.isClosed()) {
      await page.screenshot({ path: errorImage }).catch(() => {
        console.error("エラー時の画面を保存できませんでした");
      });
    }
    await rm(video, { force: true });
    throw error;
  } finally {
    try {
      await app?.close();
    } finally {
      if (!keepFrames) await recorder?.cleanup();
    }
  }
}

async function record(
  s: Scenario,
  executable: string,
  narrator: Narrator | null,
  keepFrames: boolean,
  source: string,
  session?: LmsSession,
) {
  if (s.bare) {
    await recordBare(s, executable, narrator, keepFrames, source);
    return;
  }
  if (s.lms && !session) throw new Error("収録用の API が起動していません");
  await writeUserSettings(
    s.lms && session ? { serverUrl: session.apiBase, webUrl: session.webBase } : undefined,
  );
  let workDir: string;
  let trainingRoot: string;
  let taskRoot: string;
  let openFile = "";
  if (s.lms && session) {
    assertScenario(s);
    if (!s.task) throw new Error("台本に topic と task が必要です");
    workDir = await recreateWorkDir(s.id);
    trainingRoot = await resetLmsTrainingRoot();
    taskRoot = path.join(trainingRoot, s.task);
  } else {
    ({ workDir, trainingRoot, taskRoot } = await prepareTask(s));
    openFile = path.resolve(taskRoot, s.open === null ? "README.md" : (s.open ?? "index.html"));
    if (!openFile.startsWith(`${path.resolve(taskRoot)}${path.sep}`)) {
      throw new Error("起動時に開くファイルは課題フォルダー内を指定してください");
    }
  }
  let app: ElectronApplication | undefined;
  let page: Page | undefined;
  let recorder: ScreenRecorder | undefined;
  const errorImage = path.join(WORK, `${s.id}-error.png`);
  const video = path.join(workDir, `${s.id}.mp4`);
  const poster = path.join(workDir, `${s.id}.jpg`);
  await rm(errorImage, { force: true });
  // 前回の成功動画を今回の結果と取り違えないよう、撮り直す出力だけを消す。
  for (const ext of s.clip ? [] : ["mp4", "jpg", "vtt"])
    await rm(path.join(OUT, `${s.id}.${ext}`), { force: true });
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const storage = path.resolve(USER_DATA, "User", "workspaceStorage");
      if (!storage.startsWith(`${path.resolve(BASE, "profile")}${path.sep}`)) {
        throw new Error("収録用プロファイルの場所が不正です");
      }
      await rm(storage, { recursive: true, force: true });
      app = await _electron.launch({
        executablePath: executable,
        args: [
          `--user-data-dir=${USER_DATA}`,
          `--extensions-dir=${EXTENSIONS}`,
          `--extensionDevelopmentPath=${EXTENSION}`,
          "--locale=ja",
          "--skip-welcome",
          "--skip-release-notes",
          "--force-device-scale-factor=1.5",
          ...(s.lms ? [trainingRoot] : [trainingRoot, openFile]),
        ],
        ...(s.lms ? { env: { ...process.env, USERPROFILE: HOME_DIR, HOME: HOME_DIR } } : {}),
        bypassCSP: true,
        timeout: 60_000,
      });
      page = await app.firstWindow();
      const win = await app.browserWindow(page);
      await win.evaluate((w) => {
        w.unmaximize();
        w.setContentSize(1280, 800);
      });
      await page.waitForSelector(".monaco-workbench");
      const japanese = await page
        .locator(FILE_MENU)
        .waitFor({ timeout: 10_000 })
        .then(
          () => true,
          () => false,
        );
      if (japanese) break;
      if (attempt === 1) throw new Error("VS Code が日本語で起動しませんでした");
      await app.close();
      app = undefined;
      page = undefined;
    }
    if (!page) throw new Error("VS Code のウィンドウを開けませんでした");
    const captured: Regions = {};
    const ctx: TaskContext = {
      taskRoot,
      trainingRoot,
      region: async () => {
        throw new Error("領域は収録中の画面から取ってください");
      },
    };
    if (s.lms && session) {
      const connected = session;
      const vscode = page;
      ctx.openTask = () => openRecordedTask(vscode, s, executable, connected);
      ctx.api = { base: connected.apiBase, token: connected.token };
      await prepareLmsWindow(page, s, executable, ctx);
    } else {
      await prepareWindow(page, s, ctx, openFile);
    }
    recorder = new ScreenRecorder(page, path.join(workDir, "frames"));
    const t = new Director(page, recorder, { narrator, clip: Boolean(s.clip) });
    t.setMouse(PARK.x, PARK.y);
    if (!s.clip) t.posterFile = poster;
    console.log(`[tutorials:vscode] 収録中: ${s.title}`);
    await recorder.start();
    try {
      if (!s.clip) await t.title("操作ガイド", s.title, s.summary);
      await s.run(t, {
        ...ctx,
        page,
        region: async (name, target) => {
          captured[name] = recordedRegion(await target.boundingBox(), name);
        },
      });
      await t.finish();
      await t.hideCaption();
      await t.wait(700);
    } finally {
      await recorder.stop();
    }
    const duration = await recorder.encode(video, s.clip || t.posterTaken ? null : poster, {
      width: 1600,
    });
    if (s.clip) {
      await writeClip(path.join(ROOT, "packages/content/clips"), video, s.clip, source, t.marks, {
        ...s.regions,
        ...captured,
      });
      console.log(`[tutorials:vscode] クリップを保存しました: ${s.clip}`);
      return;
    }
    if (t.narrationCues.length) {
      await muxNarration({ video, cues: t.narrationCues, duration, workDir: recorder.workDirPath });
    }
    if (t.posterTaken) {
      await run("ffmpeg", [
        "-y",
        "-loglevel",
        "error",
        "-i",
        `${poster}.full.jpg`,
        "-vf",
        "scale=960:-2",
        "-q:v",
        "4",
        poster,
      ]);
      await rm(`${poster}.full.jpg`, { force: true });
    }
    await writeFile(path.join(workDir, `${s.id}.vtt`), chaptersToVtt(t.chapters, duration));
    // 検査・エンコード・音声合成を終えたファイルだけを out に置く。
    for (const ext of ["mp4", "jpg", "vtt"]) {
      await rename(path.join(workDir, `${s.id}.${ext}`), path.join(OUT, `${s.id}.${ext}`));
    }
    console.log(`[tutorials:vscode] ${path.join(OUT, `${s.id}.mp4`)}（${duration.toFixed(1)} 秒）`);
  } catch (error) {
    if (page && !page.isClosed()) {
      await page.screenshot({ path: errorImage }).catch(() => {
        console.error("エラー時の画面を保存できませんでした");
      });
    }
    await rm(video, { force: true });
    for (const ext of s.clip ? [] : ["mp4", "jpg", "vtt"])
      await rm(path.join(OUT, `${s.id}.${ext}`), { force: true });
    throw error;
  } finally {
    try {
      await app?.close();
    } finally {
      if (!keepFrames) await recorder?.cleanup();
    }
  }
}

async function main() {
  const options = recordingOptions(process.argv.slice(2));
  const { save } = options;
  const dir = path.join(HERE, "scenarios");
  const loaded: { scenario: Scenario; file: string }[] = [];
  for (const file of (await readdir(dir)).filter((name) => /\.tsx?$/.test(name)).sort()) {
    const { default: scenario } = (await import(pathToFileURL(path.join(dir, file)).href)) as {
      default: Scenario;
    };
    assertScenario(scenario);
    loaded.push({ scenario, file: path.join(dir, file) });
  }
  const scenarios: (Scenario & { file: string; topicDir: string | null })[] = [];
  for (const { scenario: s, file } of loaded) {
    if (!selectsScenario(s, options)) continue;
    if (s.clip) clipMetadata(s.clip, "", 1, 30, {}, s.regions ?? {});
    let topicDir: string | null = null;
    if (save) {
      if (!s.topic) throw new Error(`--save には topic が必要です: ${s.id}`);
      topicDir = await resolveTopic(s.topic);
    }
    scenarios.push({ ...s, file, topicDir });
  }
  if (!scenarios.length) {
    console.log("[tutorials:vscode] 該当するシナリオがありません");
    return;
  }
  // ponytail: Windows のみ。広げるときは実行ファイル探索と言語パック用 CLI の解決を OS ごとに追加する。
  if (process.platform !== "win32")
    throw new Error("VS Code の操作動画の収録は Windows だけに対応しています");
  await run("ffmpeg", ["-version"]).catch(() => {
    throw new Error("ffmpeg を実行できません。インストールして PATH に追加してください");
  });
  const executable =
    process.env.VSCODE_EXECUTABLE ||
    (process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Programs/Microsoft VS Code/Code.exe")
      : "");
  if (!executable || !existsSync(executable)) {
    throw new Error(
      "Code.exe が見つかりません。VSCODE_EXECUTABLE に VS Code の実行ファイルを指定してください",
    );
  }
  const bareOnly = scenarios.every((item) => item.bare);
  if (!bareOnly && !existsSync(path.join(EXTENSION, "dist", "extension.js"))) {
    throw new Error("STELLA 拡張が見つかりません。apps/vscode で bun run build を実行してください");
  }
  const narrator = options.noNarration ? null : Narrator.fromEnv(path.join(TEMP, "_narration"));
  if (!options.noNarration && !narrator) {
    throw new Error(
      "GEMINI_API_KEY が設定されていません。ナレーションなしで撮るときは --no-narration を付けてください",
    );
  }
  const needsLms = scenarios.some((s) => s.lms);
  const environment = needsLms ? new TutorialEnvironment() : undefined;
  try {
    const secret = needsLms ? jwtSecret() : "";
    if (environment) await environment.boot(false);
    if (!bareOnly) await prepareProfile(executable);
    await mkdir(OUT, { recursive: true });
    await mkdir(WORK, { recursive: true });
    for (const s of scenarios) {
      let connected: LmsSession | undefined;
      if (s.lms) {
        if (!environment) throw new Error("収録用の API が起動していません");
        await environment.reset(secret);
        connected = {
          apiBase: environment.apiBase,
          webBase: environment.base,
          token: mintToken(secret, "seed-learner"),
        };
      }
      if (narrator) {
        await narrator.prefetchScripts([
          [
            titleNarration(s.title, s.summary),
            ...collectNarrationTexts(await readFile(s.file, "utf8")),
          ],
        ]);
      }
      await record(
        s,
        executable,
        narrator,
        options.keepFrames,
        path.relative(ROOT, s.file).split(path.sep).join("/"),
        connected,
      );
      if (s.topicDir) {
        await saveRecording(OUT, s.id, s.topicDir);
        console.log(`[tutorials:vscode] 教材に保存しました: ${s.topicDir}`);
      }
    }
  } finally {
    if (environment) {
      try {
        await environment.close();
      } catch (error: unknown) {
        console.error(error instanceof Error ? error.message : error);
      }
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const key = process.env.GEMINI_API_KEY;
  console.error(key ? message.split(key).join("(api key)") : message);
  process.exitCode = 1;
});
