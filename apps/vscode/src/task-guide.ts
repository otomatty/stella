/**
 * 課題を開いたときに見せる「進め方」と、編集するファイルの割り出し。
 *
 * 課題を開くと、左に編集するファイル (`submit.files` に当たるファイル)、右に課題文のパネルを
 * 並べる。パネルの先頭に、課題文を読む → 編集して保存 → 提出、の進行バーを出し、
 * いまやることを前回の確認の結果 (`.stella/last-run.json`) から示す。
 *
 * パネルはスクリプトを動かさない。リンクは、このファイルが組み立てる固定のコマンド
 * (`GUIDE_COMMANDS`) だけで、引数 (課題フォルダー・ファイル) はコマンドの側で改めて検証する。
 */

import { TASK_HELP_POLICIES } from "@stella/shared/tasks/help";
import { TASK_KIND_LABELS, type TaskManifest } from "@stella/shared/tasks/manifest";
import {
  STEP_STATUS_LABELS,
  type RunOutcome,
  type StepStatus,
} from "@stella/shared/tasks/run-result";
import { RUNNERS, type RunnerPlanKind } from "@stella/shared/tasks/runners";
import { isRunResult } from "@stella/shared/tasks/submission";
import type { OsName } from "@stella/shared/markdown/os-blocks";
import { escapeHtml } from "./lesson-doc.js";
import { listFiles, matchPatterns, readFileInRoot } from "./runner/files.js";
import {
  nextUnsubmittedProblem,
  PROBLEM_STATUS_LABELS,
  problemCountLabel,
  problemSource,
  type ProblemState,
} from "./task-problems.js";

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

interface GuideTestCounts {
  passed: number;
  total: number;
}

interface GuideStep {
  label: string;
  status: StepStatus;
  tests?: GuideTestCounts;
}

interface GuideRun {
  outcome: Exclude<RunOutcome, "cancelled">;
  steps: GuideStep[];
  tests?: GuideTestCounts;
  errorSummary?: string;
}

const STEP_MARKS: Record<StepStatus, string> = {
  passed: "✓",
  failed: "✗",
  error: "!",
  skipped: "–",
};

/** この課題の前回の確認の結果。無い・読めない・別の課題の結果なら undefined。 */
export async function readLastRun(root: string, taskId: string): Promise<GuideRun | undefined> {
  try {
    const raw: unknown = JSON.parse(
      new TextDecoder().decode(await readFileInRoot(root, ".stella/last-run.json", 1024 * 1024)),
    );
    if (!isRunResult(raw) || raw.taskId !== taskId) return undefined;
    const { outcome } = raw;
    if (outcome !== "passed" && outcome !== "failed" && outcome !== "error") return undefined;

    const tests = { passed: 0, total: 0 };
    const steps: GuideStep[] = [];
    for (const step of raw.steps) {
      if (typeof step.status !== "string" || !Object.hasOwn(STEP_MARKS, step.status))
        return undefined;
      const counts = { passed: 0, total: 0 };
      for (const test of step.tests ?? []) {
        if (test.status === "skipped") continue;
        if (test.status !== "passed" && test.status !== "failed") return undefined;
        counts.total++;
        if (test.status === "passed") counts.passed++;
      }
      tests.total += counts.total;
      tests.passed += counts.passed;
      steps.push({
        label: step.label
          .trimEnd()
          .replace(/(?:\([^()]*\)|（[^（）]*）)$/, "")
          .trimEnd(),
        status: step.status,
        ...(counts.total > 0 ? { tests: counts } : {}),
      });
    }
    const errorSummary =
      outcome === "error" ? raw.steps.find((step) => step.status === "error")?.summary : undefined;
    return {
      outcome,
      steps,
      ...(tests.total > 0 ? { tests } : {}),
      ...(errorSummary === undefined ? {} : { errorSummary }),
    };
  } catch {
    return undefined;
  }
}

export interface TaskGuideInput {
  root: string;
  manifest: TaskManifest;
  edit: EditFiles;
  lastRun?: GuideRun;
  /** 問題つきの課題の、問題ごとの状態。未指定なら一覧を未提出として出す。 */
  problems?: ProblemState[];
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

function editInstructions(input: TaskGuideInput): string {
  const { manifest, os } = input;
  const plan = RUNNERS[manifest.runner].plan;
  const where = input.edit.files.length > 0 ? "左のエディターで" : "課題フォルダーの中で";
  const lines = [`${where}ファイルを書き換え、<kbd>${saveKey(os)}</kbd> で保存したら提出します。`];
  if (plan === "static")
    lines.push("保存したら、そのファイルをブラウザーで開いて表示を確かめます。");
  if (plan === "git") lines.push("保存したら、学習フォルダーでコミットします。");
  if (plan === "ci")
    lines.push(
      "変更をコミットして GitHub に push し、GitHub Actions の実行が成功で終わるまで待ちます。",
    );
  return `<p>${lines.join("")}</p>${fileLinks(input)}`;
}

function firstRunInstructions(manifest: TaskManifest): string {
  const { plan, requiresNode } = RUNNERS[manifest.runner];
  const what: Record<RunnerPlanKind, string> = {
    git: "学習フォルダーの Git の記録と設定の確認",
    static: "HTML の文書の形と課題文の条件 (見出しなど) の確認",
    diagnose: "Node.js・npm・Git のバージョンの確認",
    vitest: "テスト",
    typescript: "型の確認 (tsc) とテスト",
    playwright: "ブラウザーでの操作テスト",
    next: "ビルドとブラウザーでの操作テスト",
    ci: "手元のコミットと GitHub Actions の実行の照合",
    dotnet: "C# のコードのビルドとテスト",
  };
  const checks = [manifest.checks.lint ? "lint" : "", manifest.checks.format ? "整形" : ""].filter(
    Boolean,
  );
  const extraChecks =
    checks.length > 0 && plan !== "static" && plan !== "ci" ? `と ${checks.join("・")}の確認` : "";
  const lines = [
    `提出の前に、${what[plan]}${extraChecks}が自動で走ります。通らなければ何も送りません。`,
  ];
  if (requiresNode) lines.push("初回は必要なパッケージを入れる (npm ci) ので数分かかります。");
  if (plan === "dotnet")
    lines.push("初回はテストの道具を NuGet から入れる (dotnet restore) ので 1 分ほどかかります。");
  if (requiresNode || plan === "dotnet")
    lines.push("VS Code にフォルダーを信頼するか尋ねられたら、信頼すると実行できます。");
  if (plan === "ci") lines.push("GitHub Actions の実行の URL と公開先の URL を尋ねます。");
  return `<p class="first">${lines.join("")}</p>`;
}

function barWidth(passed: number, total: number): string {
  return total > 0 ? ((100 * passed) / total).toFixed(1) : "0";
}

function testBar({ passed, total }: GuideTestCounts): string {
  const wide = total > 40;
  const bars = wide
    ? `<i class="p" style="width:${barWidth(passed, total)}%"></i>`
    : '<i class="p"></i>'.repeat(passed) + "<i></i>".repeat(total - passed);
  return `<p class="tests-line"><span>テスト</span><span class="tbar${wide ? " wide" : ""}" role="img" aria-label="テスト ${total} 件中 ${passed} 件が通りました">${bars}</span><span class="count">${passed} / ${total}</span></p>`;
}

function stepChips(steps: GuideStep[]): string {
  const chips = steps.map(
    ({ label, status }) =>
      `<li class="chip ${status}"><b aria-label="${STEP_STATUS_LABELS[status]}">${STEP_MARKS[status]}</b>${escapeHtml(label)}</li>`,
  );
  return `<ul class="chips">${chips.join("")}</ul>`;
}

function remainingSteps(steps: GuideStep[]): string {
  const remaining = steps
    .filter((step) => step.status === "failed")
    .map(({ label, tests }) => {
      const failed = tests ? tests.total - tests.passed : 0;
      return escapeHtml(failed > 0 ? `${label} ${failed} 件` : label);
    });
  return remaining.length > 0 ? `<p class="rest">残り: ${remaining.join(" ・ ")}</p>` : "";
}

function submitButton(root: string): string {
  return link("stella.submitTask", [root], "提出する", "button");
}

function consultLink(root: string, problemId?: string): string {
  return link("stella.consultTask", problemId ? [root, problemId] : [root], "講師に相談");
}

function logLink(): string {
  return link("stella.showRunLog", [], "実行ログ");
}

function helpLine({ manifest, root }: TaskGuideInput): string {
  const label = TASK_HELP_POLICIES[manifest.kind].hints
    ? "ヒント・解答・レビューの結果"
    : "レビューの結果";
  return `<p class="help">${link("stella.showTaskHelp", [root], label)} ・ ${consultLink(root)} ・ ${logLink()}</p>`;
}

function taskNowCard(input: TaskGuideInput): string {
  const { lastRun, manifest, root } = input;
  const submit = submitButton(root);
  switch (lastRun?.outcome) {
    case undefined:
      return `<div class="now-card none"><p class="now-title">ファイルを書き換えて保存する</p>${editInstructions(input)}<p class="actions">${submit}</p>${firstRunInstructions(manifest)}</div>`;
    case "error": {
      const summary = lastRun.errorSummary ? `<p>${escapeHtml(lastRun.errorSummary)}</p>` : "";
      return `<div class="now-card error"><p class="now-title">! 環境の問題で確認できませんでした</p>${stepChips(lastRun.steps)}${summary}<p class="actions">${submit} ${logLink()} ${consultLink(root)}</p></div>`;
    }
    case "failed":
    case "passed": {
      const figure = (lastRun.tests ? testBar(lastRun.tests) : "") + stepChips(lastRun.steps);
      if (lastRun.outcome === "failed") {
        return `<div class="now-card failed"><p class="now-title">✗ 直すところがあります</p>${figure}${remainingSteps(lastRun.steps)}<p>直して保存し、もう一度提出します。</p><p class="actions">${submit} ${consultLink(root)}</p></div>`;
      }
      return `<div class="now-card passed"><p class="now-title">✓ 確認はすべて通りました</p>${figure}<p>「提出する」を押して、振り返りを書いて送ります。</p><p class="actions">${submit}</p></div>`;
    }
  }
}

function guideProblems(input: TaskGuideInput): ProblemState[] | undefined {
  const listed = input.manifest.problems;
  if (!listed?.length) return undefined;
  if (input.problems) return input.problems;
  return listed.flatMap((problem) => {
    const source = problemSource(input.manifest, problem.id);
    return source
      ? [{ id: problem.id, title: problem.title, source, status: "not-submitted" as const }]
      : [];
  });
}

function problemListHtml(
  root: string,
  items: readonly ProblemState[],
  current: ProblemState | undefined,
): string {
  const submitted = items.filter((item) => item.status === "submitted").length;
  const rows = items
    .map((item) => {
      const label = PROBLEM_STATUS_LABELS[item.status];
      const file = link("stella.openTaskFile", [root, item.source], escapeHtml(item.title));
      return `<li${item === current ? ' class="current" aria-current="step"' : ""}>${file} <code>${escapeHtml(item.source)}</code> <span class="problem-status ${item.status}">${label}</span></li>`;
    })
    .join("");
  return [
    `<div class="pbar" role="img" aria-label="${items.length} 問中 ${submitted} 問を提出済み"><i style="width:${barWidth(submitted, items.length)}%"></i></div>`,
    `<p class="count">${problemCountLabel(submitted, items.length)}</p>`,
    `<ul class="problems">${rows}</ul>`,
  ].join("\n");
}

/** 問題つきの課題の進め方。 */
function buildProblemGuideHtml(input: TaskGuideInput, items: ProblemState[]): string {
  const { root } = input;
  const current = nextUnsubmittedProblem(items);
  let card =
    '<div class="now-card passed"><p class="now-title">✓ 全部の問題を提出しました</p></div>';
  if (current) {
    const body =
      current.status === "local-passed"
        ? "手元の確認は通っています。「提出する」を押すと送って、次の問題を開きます。"
        : `${link("stella.openTaskFile", [root, current.source], `<code>${escapeHtml(current.source)}</code>`)} を書いて保存したら提出します。確認が通れば、そのまま送って次の問題を開きます。`;
    card = `<div class="now-card"><p class="now-title">いまの問題: ${escapeHtml(current.title)}</p><p>${body}</p><p class="actions">${submitButton(root)} ${consultLink(root, current.id)}</p></div>`;
  }
  return [
    '<section class="guide" aria-label="この課題の進め方">',
    card,
    problemListHtml(root, items, current),
    helpLine(input),
    "</section>",
  ].join("\n");
}

/** 課題文のパネルの先頭に出す「進め方」。 */
export function buildTaskGuideHtml(input: TaskGuideInput): string {
  const problems = guideProblems(input);
  if (problems) return buildProblemGuideHtml(input, problems);
  const outcome = input.lastRun?.outcome;
  const submitting = outcome === "error" || outcome === "passed";
  return [
    '<section class="guide" aria-label="この課題の進め方">',
    `<ol class="stepper"><li class="done">課題文を読む</li>${submitting ? '<li class="done">編集して保存</li><li class="now" aria-current="step">提出</li>' : '<li class="now" aria-current="step">編集して保存</li><li>提出</li>'}</ol>`,
    taskNowCard(input),
    '<details class="all-steps"><summary>進め方をすべて見る</summary><ol>',
    "<li><strong>課題文を読む</strong> — 下の課題文で、作るものと、確かめられる条件を読みます。</li>",
    "<li><strong>ファイルを編集して保存する</strong></li>",
    "<li><strong>提出する</strong> — 確認が自動で走り、通ったら振り返りを書いて送ります。AI と講師のレビューで合格すると、この課題は完了です。レビューの結果は Web に通知が届き、「レビューの結果」でも読めます。</li>",
    `</ol><p>確認だけしたいときは、エディターの右上のビーカーか「${link("stella.runTask", [input.root], "STELLA: 課題を確認する")}」を使います。</p></details>`,
    helpLine(input),
    "</section>",
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
    .guide { margin: 1rem 0 1.5rem; }
    .stepper { list-style: none; display: flex; padding: 0; margin: 0 0 0.7rem; }
    .stepper li {
      flex: 1;
      position: relative;
      text-align: center;
      font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
      padding-top: 26px;
      line-height: 1.35;
    }
    .stepper li::before {
      content: "";
      position: absolute;
      z-index: 1;
      top: 3px;
      left: 50%;
      transform: translateX(-50%);
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1.5px solid var(--vscode-descriptionForeground);
      background: var(--vscode-editor-background);
      font-size: 11px;
      line-height: 16px;
      color: var(--vscode-editor-background);
    }
    .stepper li::after {
      content: "";
      position: absolute;
      top: 12px;
      left: -50%;
      width: 100%;
      height: 2px;
      background: var(--vscode-panel-border);
    }
    .stepper li:first-child::after { display: none; }
    .stepper li.done::before {
      content: "✓";
      background: var(--vscode-testing-iconPassed);
      border-color: var(--vscode-testing-iconPassed);
    }
    .stepper li.done::after, .stepper li.now::after {
      background: var(--vscode-testing-iconPassed);
    }
    .stepper li.now { color: var(--vscode-foreground); font-weight: 600; }
    .stepper li.now::before {
      background: var(--vscode-focusBorder);
      border-color: var(--vscode-focusBorder);
    }
    .now-card {
      padding: 0.7rem 0.9rem 0.75rem;
      border: 1px solid var(--vscode-panel-border);
      border-left: 3px solid var(--vscode-focusBorder);
      border-radius: 4px;
      background: var(--vscode-textBlockQuote-background);
    }
    .now-card.failed { border-left-color: var(--vscode-testing-iconFailed); }
    .now-card.error { border-left-color: var(--vscode-editorWarning-foreground); }
    .now-card.passed { border-left-color: var(--vscode-testing-iconPassed); }
    .now-card p { margin: 0.3rem 0; }
    .now-title { font-weight: 600; font-size: 1.05em; }
    .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem 0.9rem; }
    .button {
      display: inline-block;
      padding: 0.3rem 0.9rem;
      border-radius: 3px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      text-decoration: none;
    }
    .button:hover { background: var(--vscode-button-hoverBackground); }
    .first, .rest { font-size: 0.9em; color: var(--vscode-descriptionForeground); }
    .tests-line { display: flex; align-items: center; gap: 0.6rem; font-variant-numeric: tabular-nums; }
    .tbar { display: inline-flex; gap: 3px; flex: 1; max-width: 220px; }
    .tbar i { flex: 1; height: 8px; border-radius: 2px; background: var(--vscode-panel-border); }
    .tbar i.p { background: var(--vscode-testing-iconPassed); }
    .tbar.wide {
      display: block;
      height: 8px;
      border-radius: 2px;
      background: var(--vscode-panel-border);
      overflow: hidden;
    }
    .tbar.wide i { display: block; height: 100%; border-radius: 0; }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin: 0.5rem 0;
      padding: 0;
      list-style: none;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0 0.55rem;
      border-radius: 999px;
      border: 1px solid var(--vscode-panel-border);
      font-size: 0.88em;
      white-space: nowrap;
    }
    .chip.passed b { color: var(--vscode-testing-iconPassed); }
    .chip.failed { border-color: var(--vscode-testing-iconFailed); }
    .chip.failed b { color: var(--vscode-testing-iconFailed); }
    .chip.error { border-color: var(--vscode-editorWarning-foreground); }
    .chip.error b { color: var(--vscode-editorWarning-foreground); }
    .chip.skipped { color: var(--vscode-descriptionForeground); }
    .all-steps { margin-top: 0.6rem; }
    .all-steps summary { cursor: pointer; }
    .pbar {
      height: 6px;
      border-radius: 3px;
      background: var(--vscode-panel-border);
      overflow: hidden;
      margin: 0.6rem 0 0.2rem;
    }
    .pbar i { display: block; height: 100%; background: var(--vscode-testing-iconPassed); }
    kbd {
      padding: 0 0.3rem;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family);
      font-size: 0.9em;
    }
    .files { color: var(--vscode-descriptionForeground); }
    .count { margin: 0.25rem 0; font-weight: bold; }
    .problems { list-style: none; padding-left: 0; margin: 0.25rem 0 0.5rem; }
    .problems li { margin: 0.15rem 0; }
    .problems li.current {
      background: var(--vscode-editor-inactiveSelectionBackground);
      font-weight: 600;
    }
    .problem-status { color: var(--vscode-descriptionForeground); }
    .help { margin: 0.5rem 0 0.25rem; }
    .readme-title { margin-top: 1.5rem; }`;
