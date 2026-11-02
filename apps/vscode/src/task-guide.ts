/**
 * 課題を開いたときに見せる「進め方」と、編集するファイルの割り出し。
 *
 * 課題を開くと、左に編集するファイル (`submit.files` に当たるファイル)、右に課題文のパネルを
 * 並べる。パネルの先頭に、課題文を読む → ファイルを編集して保存 → 課題を確認する → 提出、の
 * 手順を runner ごとの言葉で出し、いまどの段かを前回の確認の結果 (`.stella/last-run.json`) から示す。
 *
 * パネルはスクリプトを動かさない。リンクは、このファイルが組み立てる固定のコマンド
 * (`GUIDE_COMMANDS`) だけで、引数 (課題フォルダー・ファイル) はコマンドの側で改めて検証する。
 */

import { TASK_HELP_POLICIES } from "@stella/shared/tasks/help";
import { TASK_KIND_LABELS, type TaskManifest } from "@stella/shared/tasks/manifest";
import type { RunOutcome } from "@stella/shared/tasks/run-result";
import { RUNNERS, type RunnerPlanKind } from "@stella/shared/tasks/runners";
import { isRunResult } from "@stella/shared/tasks/submission";
import type { OsName } from "@stella/shared/markdown/os-blocks";
import { escapeHtml } from "./lesson-doc.js";
import { listFiles, matchPatterns, readFileInRoot } from "./runner/files.js";

/** 課題文のパネルが開けるコマンド。WebView の `enableCommandUris` にも同じものを渡す。 */
export const GUIDE_COMMANDS = [
  "stella.openTaskFile",
  "stella.runTask",
  "stella.submitTask",
  "stella.consultTask",
  "stella.showTaskHelp",
  "stella.showRunLog",
] as const;
type GuideCommand = (typeof GUIDE_COMMANDS)[number];

/** 最初に開くファイルの数。多い課題は残りを課題文のリンクから開く。 */
export const OPEN_FILES_LIMIT = 3;
/** 課題文に並べる編集するファイルの数。 */
const LISTED_FILES_LIMIT = 10;

/** 画像・フォント・音声・動画・アーカイブなど、テキストのエディターでは開けないファイル。 */
const BINARY_EXTENSIONS =
  /\.(png|jpe?g|gif|webp|avif|ico|bmp|tiff?|pdf|woff2?|ttf|otf|eot|zip|gz|tgz|mp3|mp4|wav|ogg|webm|mov|wasm|sqlite3?|db)$/i;

/** テキストのエディターで開けそうなファイルか (課題を開いたときに自動で開くのはこれだけ)。 */
export function opensAsText(rel: string): boolean {
  return !BINARY_EXTENSIONS.test(rel);
}

export interface EditFiles {
  /** 編集するファイル (課題フォルダーからの `/` 区切りの相対パス)。 */
  files: string[];
  /** どのファイルにも当たらなかった提出の指定 (まだ作っていないファイル)。 */
  missing: string[];
}

/**
 * 編集するファイル = 提出するファイル (`submit.files`) に当たり、配布したテスト・設定
 * (`protected`) ではないファイル。歩くのは課題フォルダーの中だけで、node_modules などには入らない。
 */
export async function resolveEditFiles(root: string, manifest: TaskManifest): Promise<EditFiles> {
  let all: string[];
  try {
    all = await listFiles(root);
  } catch {
    return { files: [], missing: [...manifest.submit.files] };
  }
  const submitted = matchPatterns(all, manifest.submit.files);
  const fixed = new Set(matchPatterns(all, manifest.protected).files);
  return {
    files: submitted.files.filter((file) => !fixed.has(file)),
    missing: submitted.unmatched,
  };
}

/** この課題の前回の確認の結果。無い・読めない・別の課題の結果なら undefined。 */
export async function readLastOutcome(
  root: string,
  taskId: string,
): Promise<RunOutcome | undefined> {
  try {
    const raw: unknown = JSON.parse(
      new TextDecoder().decode(await readFileInRoot(root, ".stella/last-run.json", 1024 * 1024)),
    );
    return isRunResult(raw) && raw.taskId === taskId ? raw.outcome : undefined;
  } catch {
    return undefined;
  }
}

export interface TaskGuideInput {
  root: string;
  manifest: TaskManifest;
  edit: EditFiles;
  lastOutcome?: RunOutcome;
  os: OsName;
}

function commandHref(id: GuideCommand, args: unknown[] = []): string {
  const query = args.length > 0 ? `?${encodeURIComponent(JSON.stringify(args))}` : "";
  return escapeHtml(`command:${id}${query}`);
}

function link(id: GuideCommand, args: unknown[], label: string, className = ""): string {
  return `<a${className ? ` class="${className}"` : ""} href="${commandHref(id, args)}">${label}</a>`;
}

function saveKey(os: OsName): string {
  return os === "macos" ? "⌘S" : "Ctrl+S";
}

type StepId = "read" | "edit" | "check" | "submit";

/** 前回の確認の結果から、いま取り組む段と、その段の一言。 */
function currentStep(outcome: RunOutcome | undefined): { step: StepId; note: string } {
  switch (outcome) {
    case "passed":
      return { step: "submit", note: "前回の確認はすべて通りました。提出できます。" };
    case "failed":
      return {
        step: "edit",
        note: "前回の確認で直すところがありました。結果のパネルを見て直し、保存してもう一度確認してください。",
      };
    case "error":
      return {
        step: "check",
        note: "前回は環境の問題で確認できませんでした。結果のパネルの案内を見て、もう一度確認してください。",
      };
    default:
      return {
        step: "edit",
        note: "まだ確認していません。ファイルを書き換えて保存したら「課題を確認する」を押してください。",
      };
  }
}

function fileLinks(input: TaskGuideInput): string {
  const { root, edit } = input;
  const listed = edit.files.slice(0, LISTED_FILES_LIMIT);
  const links = listed.map((file) =>
    link("stella.openTaskFile", [root, file], `<code>${escapeHtml(file)}</code>`),
  );
  if (edit.files.length > listed.length) links.push(`ほか ${edit.files.length - listed.length} 件`);
  const missing = edit.missing.map((pattern) => `<code>${escapeHtml(pattern)}</code>`);
  const parts: string[] = [];
  if (links.length > 0) parts.push(`編集するファイル: ${links.join("、")}`);
  if (missing.length > 0)
    parts.push(
      `まだ無いファイル: ${missing.join("、")} (課題文に沿って、課題フォルダーの中に作ります)`,
    );
  return parts.length > 0 ? `<p class="files">${parts.join("<br />")}</p>` : "";
}

function editStep(input: TaskGuideInput): string {
  const { manifest, os } = input;
  const plan = RUNNERS[manifest.runner].plan;
  const where = input.edit.files.length > 0 ? "左のエディターで" : "課題フォルダーの中で";
  const lines = [`${where}ファイルを書き換え、<kbd>${saveKey(os)}</kbd> で保存します。`];
  if (plan === "static")
    lines.push("保存したら、そのファイルをブラウザーで開いて表示を確かめます。");
  if (plan === "ci")
    lines.push(
      "変更をコミットして GitHub に push し、GitHub Actions の実行が成功で終わるまで待ちます。",
    );
  return `<p>${lines.join("")}</p>${fileLinks(input)}`;
}

function checkStep(input: TaskGuideInput): string {
  const { manifest, root } = input;
  const plan = RUNNERS[manifest.runner].plan;
  const what: Record<RunnerPlanKind, string> = {
    static: "HTML の文書の形と、課題文の条件 (見出しなど) を確かめます。",
    diagnose: "Node.js・npm・Git の版を確かめます。",
    vitest: "テストを手元で実行します。",
    playwright: "ブラウザーでの操作テストを手元で実行します。",
    next: "ビルドとブラウザーでの操作テストを手元で実行します。",
    ci: "GitHub Actions の実行の URL と公開先の URL を入力すると、手元のコミットと照らし合わせます。",
  };
  const checks = [manifest.checks.lint ? "lint" : "", manifest.checks.format ? "整形" : ""].filter(
    Boolean,
  );
  const extra: string[] = [];
  if (checks.length > 0 && plan !== "static" && plan !== "ci")
    extra.push(`${checks.join("と")}の確認もします。`);
  if (RUNNERS[manifest.runner].requiresNode)
    extra.push(
      "初回は必要なパッケージを入れる (npm ci) ので数分かかります。VS Code にフォルダーを信頼するか尋ねられたら、信頼すると実行できます。",
    );
  return [
    `<p>${link("stella.runTask", [root], "課題を確認する", "button")} を押します。${what[plan]}${extra.join("")}</p>`,
    "<p>画面の下のステータスバーの「課題を確認する」からも実行できます。結果は右のパネルに出ます。直すところがあれば 2 に戻ります。</p>",
  ].join("");
}

function submitStep(input: TaskGuideInput): string {
  return `<p>確認がすべて通ったら ${link("stella.submitTask", [input.root], "提出する", "button")} を押し、実装した内容を短く説明します。AI と講師のレビューで合格すると、この課題は完了です。レビューの結果は Web に通知が届き、この下の「レビューの結果」でも読めます。</p>`;
}

const STEP_TITLES: Record<StepId, string> = {
  read: "課題文を読む",
  edit: "ファイルを編集して保存する",
  check: "手元で確認する",
  submit: "提出する",
};

/** 課題文のパネルの先頭に出す「進め方」。 */
export function buildTaskGuideHtml(input: TaskGuideInput): string {
  const { manifest, root } = input;
  const { step: current, note } = currentStep(input.lastOutcome);
  const bodies: Record<StepId, string> = {
    read: "<p>下の課題文で、作るものと、確認で確かめられる条件を読みます。</p>",
    edit: editStep(input),
    check: checkStep(input),
    submit: submitStep(input),
  };
  const order: StepId[] = ["read", "edit", "check", "submit"];
  const steps = order
    .map((id) => {
      const here = id === current;
      return `<li class="step${here ? " current" : ""}"><h3>${STEP_TITLES[id]}${here ? ' <span class="here">いまここ</span>' : ""}</h3>${bodies[id]}</li>`;
    })
    .join("\n");
  const helpLabel = TASK_HELP_POLICIES[manifest.kind].hints
    ? "ヒント・解答・レビューの結果"
    : "レビューの結果";
  return [
    `<section class="guide" aria-label="この課題の進め方">`,
    `<h2>進め方</h2>`,
    `<p class="status ${input.lastOutcome ?? "none"}">${escapeHtml(note)}</p>`,
    `<ol class="steps">\n${steps}\n</ol>`,
    `<p class="help">困ったとき・提出のあと: ${link("stella.showTaskHelp", [root], helpLabel)} ・ ${link("stella.consultTask", [root], "講師に相談")} ・ ${link("stella.showRunLog", [], "実行ログ")}</p>`,
    `</section>`,
  ].join("\n");
}

/** パネルの見出しの下に出す、課題の種別と確かめ方。 */
export function guideMetaText(manifest: TaskManifest): string {
  return `${TASK_KIND_LABELS[manifest.kind]} ・ ${RUNNERS[manifest.runner].label}`;
}

/** 課題文の先頭の見出しが課題名と同じなら外す (パネルの見出しと重ねない)。 */
export function stripLeadingTitle(markdown: string, title: string): string {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const first = lines.findIndex((line) => line.trim() !== "");
  if (first === -1) return markdown;
  const heading = /^# (.+)$/.exec(lines[first]?.trim() ?? "");
  if (!heading || heading[1]?.trim() !== title.trim()) return markdown;
  return lines.slice(first + 1).join("\n");
}

/** 課題文のパネルの「進め方」の見た目。 */
export const GUIDE_CSS = `
    .meta { color: var(--vscode-descriptionForeground); margin-top: 0; }
    .guide {
      margin: 1rem 0 1.5rem;
      padding: 0.75rem 1rem 0.5rem;
      border: 1px solid var(--vscode-panel-border);
      border-left: 3px solid var(--vscode-focusBorder);
      border-radius: 4px;
    }
    .guide h2 { margin: 0 0 0.25rem; font-size: 1.1em; }
    .guide .status { margin: 0.25rem 0 0.5rem; }
    .guide .status.passed { color: var(--vscode-testing-iconPassed); }
    .guide .status.failed { color: var(--vscode-testing-iconFailed); }
    .guide .status.error { color: var(--vscode-editorWarning-foreground); }
    .steps { padding-left: 1.4rem; margin: 0; }
    .steps .step { margin: 0.5rem 0; padding: 0.1rem 0.5rem; border-radius: 4px; }
    .steps .step.current { background: var(--vscode-editor-inactiveSelectionBackground); }
    .steps h3 { font-size: 1em; font-weight: bold; margin: 0.2rem 0; }
    .steps p { margin: 0.2rem 0; }
    .here {
      display: inline-block;
      margin-left: 0.4rem;
      padding: 0 0.4rem;
      font-size: 0.8em;
      font-weight: normal;
      border-radius: 3px;
      color: var(--vscode-badge-foreground);
      background: var(--vscode-badge-background);
    }
    .button {
      display: inline-block;
      padding: 0.1rem 0.6rem;
      border-radius: 3px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      text-decoration: none;
    }
    .button:hover { background: var(--vscode-button-hoverBackground); }
    kbd {
      padding: 0 0.3rem;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family);
      font-size: 0.9em;
    }
    .files { color: var(--vscode-descriptionForeground); }
    .help { margin: 0.5rem 0 0.25rem; }
    .readme-title { margin-top: 1.5rem; }`;
