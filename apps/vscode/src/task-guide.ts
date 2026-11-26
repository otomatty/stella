/**
 * 課題を開いたときに見せる「進め方」と、編集するファイルの割り出し。
 *
 * 課題を開くと、左に編集するファイル (`submit.files` に当たるファイル)、右に課題文のパネルを
 * 並べる。パネルの先頭に、課題文を読む → 編集して保存 → 提出 → レビューの進行バーを出し、
 * 前回の確認の結果と LMS の課題の状態から、いまやることを示す。
 *
 * パネルはスクリプトを動かさない。リンクは、このファイルが組み立てる固定のコマンド
 * (`GUIDE_COMMANDS`) だけで、引数 (課題フォルダー・ファイル) はコマンドの側で改めて検証する。
 */

import { TASK_STATUS_LABELS, type TaskStatus } from "@stella/shared/tasks/catalog";
import { TASK_HELP_POLICIES } from "@stella/shared/tasks/help";
import { TASK_KIND_LABELS, type TaskManifest } from "@stella/shared/tasks/manifest";
import { problemStepLabel, type TaskRefSummary } from "@stella/shared/tasks/problem-steps";
import { problemFiles } from "@stella/shared/tasks/problems";
import type { RunOutcome, RunResult, TestCaseResult } from "@stella/shared/tasks/run-result";
import { RUNNERS, type RunnerPlanKind } from "@stella/shared/tasks/runners";
import { isRunResult } from "@stella/shared/tasks/submission";
import type { OsName } from "@stella/shared/markdown/os-blocks";
import { escapeHtml } from "./markdown-html.js";
import { checkProgressHtml, type TaskCheckView } from "./task-check-progress-view.js";
import { listFiles, matchEditableFiles, readFileInRoot } from "./runner/files.js";
import {
  PROBLEM_STATUS_LABELS,
  problemSource,
  problemToWorkOn,
  type ProblemState,
  type ProblemResults,
} from "./task-problems.js";
import {
  countTests,
  remainingSteps,
  renderFailedTest,
  RUN_SUMMARY_CSS,
  shortStepLabel,
  stepChips,
  type StepSummary,
  testBar,
  type TestCounts,
} from "./task-run-summary.js";

/** 課題文のパネルが開けるコマンド。WebView の `enableCommandUris` にも同じものを渡す。 */
export const GUIDE_COMMANDS = [
  "stella.openTaskFile",
  "stella.openProblemLocation",
  "stella.openTaskWebPage",
  "stella.runTask",
  "stella.submitTask",
  "stella.consultTask",
  "stella.showTaskHelp",
  "stella.showTaskReadme",
  "stella.showRunLog",
  "stella.openWalkthrough",
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
  const { files, unmatched } = matchEditableFiles(all, manifest);
  return { files, missing: unmatched };
}

export interface GuideRun {
  outcome: Exclude<RunOutcome, "cancelled">;
  steps: StepSummary[];
  tests?: TestCounts;
  errorSummary?: string;
}

/** 課題フォルダーに保存した、この課題の前回の結果。 */
export async function readLastResult(root: string, taskId: string): Promise<RunResult | undefined> {
  try {
    const raw: unknown = JSON.parse(
      new TextDecoder().decode(await readFileInRoot(root, ".stella/last-run.json", 1024 * 1024)),
    );
    if (
      !isRunResult(raw) ||
      raw.taskId !== taskId ||
      typeof raw.outcome !== "string" ||
      !Object.hasOwn(RUNNERS, raw.runner) ||
      Object.values(raw.toolVersions).some((value) => typeof value !== "string")
    )
      return undefined;
    // 提出用の検証に加え、結果パネルが使う任意の表示項目も確かめる。
    if (
      raw.steps.some(
        (step) =>
          typeof step.status !== "string" ||
          step.tests?.some(
            ({ status, file, message }) =>
              typeof status !== "string" ||
              (file !== undefined && typeof file !== "string") ||
              (message !== undefined && typeof message !== "string"),
          ) ||
          (step.logTail !== undefined && typeof step.logTail !== "string") ||
          (step.files !== undefined &&
            (!Array.isArray(step.files) || step.files.some((file) => typeof file !== "string"))) ||
          (step.lint !== undefined &&
            (!Array.isArray(step.lint) ||
              step.lint.some(
                (finding) =>
                  !finding ||
                  typeof finding.file !== "string" ||
                  typeof finding.line !== "number" ||
                  typeof finding.column !== "number" ||
                  (finding.ruleId !== null && typeof finding.ruleId !== "string") ||
                  typeof finding.message !== "string" ||
                  (finding.severity !== "error" && finding.severity !== "warning"),
              ))),
      )
    )
      return undefined;
    return raw;
  } catch {
    return undefined;
  }
}

/** 課題文とステータスバーに出す、前回の確認の要約。 */
export async function readLastRun(root: string, taskId: string): Promise<GuideRun | undefined> {
  const raw = await readLastResult(root, taskId);
  if (!raw || raw.outcome === "cancelled") return undefined;
  const { outcome } = raw;

  const tests = { passed: 0, total: 0 };
  const steps: StepSummary[] = [];
  for (const step of raw.steps) {
    const counts = countTests(step.tests);
    tests.total += counts.total;
    tests.passed += counts.passed;
    steps.push({
      label: shortStepLabel(step.label),
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
}

export interface TaskGuideInput {
  root: string;
  manifest: TaskManifest;
  edit: EditFiles;
  lastRun?: GuideRun;
  taskStatus?: TaskStatus;
  /** 問題つきの課題で、LMS が案内するヒント・解答例・解説へのリンクの文言。 */
  helpLabel?: string;
  /** 問題つきの課題の、問題ごとの状態。未指定なら一覧を未提出として出す。 */
  problems?: ProblemState[];
  problemProgress?: { passed: number; total: number };
  /** 古い配布の控えを書き出せなかったとき。 */
  releaseError?: string;
  problemResults?: ProblemResults;
  problemRun?: RunResult;
  problemTestLines?: ReadonlyMap<TestCaseResult, number>;
  /** いまの問題の Vitest テスト本文。手元のファイルだけで、サーバーには送らない。 */
  problemTestSource?: { problemId: string; source: string };
  stageId?: string;
  nextProblemReason?: string;
  problemPreparationError?: string;
  os: OsName;
  check?: TaskCheckView;
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

function remainingStepsHtml(steps: StepSummary[]): string {
  const remaining = remainingSteps(steps);
  return remaining.length > 0 ? `<p class="rest">残り: ${remaining.join(" ・ ")}</p>` : "";
}

function submitButton(root: string, problemId?: string): string {
  return link("stella.submitTask", problemId ? [root, problemId] : [root], "提出する", "button");
}

function consultLink(root: string, problemId?: string): string {
  return link("stella.consultTask", problemId ? [root, problemId] : [root], "管理者に相談");
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
        return `<div class="now-card failed"><p class="now-title">✗ 直すところがあります</p>${figure}${remainingStepsHtml(lastRun.steps)}<p>直して保存し、もう一度提出します。</p><p class="actions">${submit} ${consultLink(root)}</p></div>`;
      }
      return `<div class="now-card passed"><p class="now-title">✓ 確認はすべて通りました</p>${figure}<p>「提出する」を押して、振り返りを書いて送ります。</p><p class="actions">${submit}</p></div>`;
    }
  }
}

const GUIDE_STEPS = ["課題文を読む", "編集して保存", "提出", "レビュー"];

function taskProgress(input: TaskGuideInput): { step: number; card: string } {
  const { taskStatus, lastRun, root } = input;
  const review = link("stella.showTaskHelp", [root], "レビューの結果を見る");
  switch (taskStatus) {
    case "passed":
    case "ai-passed": {
      const suffix = taskStatus === "ai-passed" ? " (AI で合格)" : "";
      return {
        step: GUIDE_STEPS.length,
        card: `<div class="now-card passed"><p class="now-title">✓ 合格しました${suffix}</p><p>この課題は完了です。</p><p class="actions">${review}</p></div>`,
      };
    }
    case "submitted":
    case "instructor-pending": {
      const body =
        taskStatus === "submitted"
          ? "結果は、ふつう数分で届きます。ここと Web の通知に出ます。"
          : "管理者が確認しています。結果は、ここと Web の通知に出ます。";
      const refresh = link("stella.showTaskReadme", [root], "表示を更新する");
      return {
        step: 3,
        card: `<div class="now-card review"><p class="now-title">… ${TASK_STATUS_LABELS[taskStatus]}</p><p>${body}</p><p class="actions">${review} ${refresh}</p></div>`,
      };
    }
    case "resubmit":
      if (!lastRun || lastRun.outcome === "passed") {
        return {
          step: 1,
          card: `<div class="now-card failed"><p class="now-title">✗ 再提出になりました</p><p>レビューの結果を見て直し、保存してもう一度提出します。</p><p class="actions">${submitButton(root)} ${review} ${consultLink(root)}</p></div>`,
        };
      }
  }
  const outcome = lastRun?.outcome;
  return { step: outcome === "error" || outcome === "passed" ? 2 : 1, card: taskNowCard(input) };
}

export function guideProblems(input: TaskGuideInput) {
  const states = new Map(input.problems?.map((problem) => [problem.id, problem]));
  const server = new Map(input.problemResults?.problems.map((problem) => [problem.id, problem]));
  return (input.manifest.problems ?? []).map(({ id, title }, index) => {
    const local = states.get(id);
    const remote = server.get(id);
    const lock: "locked-video" | "locked-previous" | "waiting" | undefined =
      remote?.state === "locked-video" || remote?.state === "locked-previous"
        ? remote.state
        : local?.lockReason
          ? "locked-previous"
          : input.problems && !local
            ? "waiting"
            : undefined;
    return {
      id,
      title,
      index,
      label: problemStepLabel(title, index),
      source: local?.source ?? problemSource(input.manifest, id),
      hasLocalSource: local?.onDisk === true,
      lockReason: local?.lockReason,
      status: local?.status ?? "not-submitted",
      failed: local?.failed,
      lock,
    };
  });
}

type GuideProblem = ReturnType<typeof guideProblems>[number];

export function problemNow(input: TaskGuideInput, items = guideProblems(input)) {
  if (input.releaseError) return { kind: "waiting", current: undefined } as const;
  const currentId = input.problems && problemToWorkOn(input.problems)?.id;
  const current = items.find(
    (item) =>
      !item.lock &&
      item.source &&
      (input.problems ? item.id === currentId : item.status !== "submitted"),
  );
  if (current) {
    const run = input.problemRun?.problemId === current.id ? input.problemRun : undefined;
    const kind =
      run?.outcome === "error" || run?.outcome === "failed"
        ? run.outcome
        : run?.outcome === "passed" || current.status === "local-passed"
          ? "passed"
          : "edit";
    return { kind, current, run } as const;
  }
  const pending = items.filter(({ status }) => status !== "submitted");
  if (!pending.length) return { kind: "done", current: undefined } as const;
  if (input.problemPreparationError) return { kind: "waiting", current: undefined } as const;
  const next = input.problemResults?.problems.find(({ id }) =>
    pending.some((item) => item.id === id),
  );
  const item = pending.find(({ id }) => id === next?.id) ?? pending[0];
  if (item.lock === "locked-video" && next)
    return { kind: "video", current: undefined, item, next } as const;
  return { kind: "waiting", current: undefined } as const;
}

export function problemCellGroups(
  items: readonly GuideProblem[],
  now: ReturnType<typeof problemNow>,
) {
  const drills: { label: string; style: string; text: string }[] = [];
  const advanced: typeof drills = [];
  for (const item of items) {
    const active = item.id === now.current?.id;
    const status =
      item.status === "submitted"
        ? { style: "submitted", text: "提出済み" }
        : item.lock
          ? { style: "locked", text: "未解放" }
          : item.failed || (active && (now.kind === "failed" || now.kind === "error"))
            ? { style: "failed", text: active ? "いまの問題・要確認" : "要確認" }
            : active
              ? { style: "current", text: "いまの問題" }
              : { style: "pending", text: PROBLEM_STATUS_LABELS[item.status] };
    (item.label === "応用" ? advanced : drills).push({ label: item.label, ...status });
  }
  return { drills, advanced };
}

export function problemRefText(ref: TaskRefSummary) {
  const kind = ref.lessonType === "slides" || ref.lessonType === "video" ? "動画" : "まとめ";
  return {
    title: `${kind}『${ref.title}』`,
    suffix: ref.accessible
      ? ref.completed
        ? " ✓"
        : ""
      : `${ref.completed ? " ✓" : ""}${ref.stageTitle ? `（『${ref.stageTitle}』を受講すると見られます）` : ""}`,
  };
}

function problemRefsHtml(refs?: readonly TaskRefSummary[]): string {
  if (!refs?.length) return "";
  const items = refs.map((ref) => {
    const { title, suffix } = problemRefText(ref);
    const text = escapeHtml(title);
    return (
      (ref.accessible ? link("stella.openTaskWebPage", [ref.stageId, ref.lessonId], text) : text) +
      escapeHtml(suffix)
    );
  });
  return `<p class="problem-refs">手がかり: ${items.join(" ・ ")}</p>`;
}

function problemProgressHtml(
  items: readonly GuideProblem[],
  now: ReturnType<typeof problemNow>,
): string {
  const { drills, advanced } = problemCellGroups(items, now);
  const group = (cells: typeof drills) =>
    cells.length > 0
      ? `<span class="problem-cells">${cells
          .map(
            ({ label, style, text }) =>
              `<i class="problem-cell ${style}" role="img" aria-label="${label} ${text}" title="${label} ${text}"></i>`,
          )
          .join("")}</span>`
      : "";
  const submitted = items.filter(({ status }) => status === "submitted").length;
  return `<div class="problem-progress" role="group" aria-label="${items.length} 問中 ${submitted} 問を提出済み">${group(drills)}${group(advanced)}</div>
<p class="problem-count"><strong>提出 ${submitted} / ${items.length} 問</strong><span>ドリル ${drills.length} ・ 応用 ${advanced.length}</span></p>`;
}

export type ProblemTestExample =
  | { kind: "value"; call: string; expected: string }
  | { kind: "throws"; call: string }
  | { kind: "parameters"; name: string; type: string }
  | { kind: "returns"; name: string; type: string };

const VALUE_EXPECT = /^\s*expect\((.*)\)\s*\.\s*(?:toBe|toEqual|toStrictEqual)\s*\((.*)\)\s*;?\s*$/;
const THROW_EXPECT = /^\s*expect\(\s*\(\s*\)\s*=>\s*(.*)\)\s*\.\s*toThrow\s*\((.*)\)\s*;?\s*$/;
const PARAM_EXPECT =
  /^\s*expectTypeOf\((.*)\)\s*\.\s*parameters\s*\.\s*toEqualTypeOf\s*<(.+)>\s*\(\s*\)\s*;?\s*$/;
const RETURN_EXPECT =
  /^\s*expectTypeOf\((.*)\)\s*\.\s*returns\s*\.\s*toEqualTypeOf\s*<(.+)>\s*\(\s*\)\s*;?\s*$/;

/** テスト本文の 1 行に収まる確認だけを表にする。取れない expect は件数だけ数える。 */
export function problemTestExamples(source: string): {
  examples: ProblemTestExample[];
  other: number;
} {
  const examples: ProblemTestExample[] = [];
  let other = 0;
  for (const line of source.split(/\r?\n/)) {
    const value = VALUE_EXPECT.exec(line);
    if (value?.[1] !== undefined && value[2] !== undefined) {
      examples.push({ kind: "value", call: value[1], expected: value[2] });
      continue;
    }
    const thrown = THROW_EXPECT.exec(line);
    if (thrown?.[1] !== undefined) {
      examples.push({ kind: "throws", call: thrown[1] });
      continue;
    }
    const parameters = PARAM_EXPECT.exec(line);
    if (parameters?.[1] !== undefined && parameters[2] !== undefined) {
      examples.push({ kind: "parameters", name: parameters[1].trim(), type: parameters[2] });
      continue;
    }
    const returns = RETURN_EXPECT.exec(line);
    if (returns?.[1] !== undefined && returns[2] !== undefined) {
      examples.push({ kind: "returns", name: returns[1].trim(), type: returns[2] });
      continue;
    }
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || /^import\s/.test(trimmed)) continue;
    if (/\b(?:await\s+)?expect(?:TypeOf)?\s*[(<]/.test(line)) other += 1;
  }
  return { examples, other };
}

function problemTestExamplesHtml(
  input: TaskGuideInput,
  now: ReturnType<typeof problemNow>,
): string {
  const current = now.current;
  const loaded = input.problemTestSource;
  if (!current || !loaded || loaded.problemId !== current.id) return "";
  const { examples, other } = problemTestExamples(loaded.source);
  if (!examples.length && other === 0) return "";
  const rows = examples.flatMap((example) => {
    if (example.kind === "value") {
      return [
        `<tr><td><code>${escapeHtml(example.call)}</code></td><td><code>${escapeHtml(example.expected)}</code></td></tr>`,
      ];
    }
    if (example.kind === "throws") {
      return [`<tr><td><code>${escapeHtml(example.call)}</code></td><td>エラーを投げる</td></tr>`];
    }
    return [];
  });
  const types = new Map<string, { parameters?: string; returns?: string }>();
  for (const example of examples) {
    if (example.kind !== "parameters" && example.kind !== "returns") continue;
    const slot = types.get(example.name) ?? {};
    slot[example.kind] = example.type;
    types.set(example.name, slot);
  }
  const typeLines = [...types].map(([, slot]) => {
    const parts = [
      slot.parameters ? `引数の型 <code>${escapeHtml(slot.parameters)}</code>` : "",
      slot.returns ? `戻り値の型 <code>${escapeHtml(slot.returns)}</code>` : "",
    ].filter(Boolean);
    return `<p class="test-example-types">${parts.join(" ・ ")}</p>`;
  });
  const table = rows.length
    ? `<table class="test-examples"><thead><tr><th>呼び出し</th><th>期待する答え</th></tr></thead><tbody>${rows.join("")}</tbody></table>`
    : "";
  const testPath = problemFiles(RUNNERS[input.manifest.runner].plan, current.id)?.test;
  const more =
    other > 0
      ? `<p class="test-examples-more">ほかに ${other} 件の確認があります${
          testPath
            ? ` ${link("stella.openTaskFile", [input.root, testPath], "テストファイルを開く")}`
            : ""
        }</p>`
      : "";
  return `<h2 class="test-examples-title">テストで確かめる例</h2>${table}${typeLines.join("")}${more}`;
}

function problemFileLocation(root: string, problemId: string, file: string, line: number): string {
  return link(
    "stella.openProblemLocation",
    [root, problemId, file, line],
    `<code>${escapeHtml(file)}:${line}</code>`,
  );
}

function problemChecks(input: TaskGuideInput, run?: RunResult): string {
  if (!run) return "";
  const chips: StepSummary[] = [];
  const details: string[] = [];
  for (const step of run.steps) {
    if (step.status === "skipped" || (step.id === "deps" && step.status === "passed")) continue;
    const { passed, total } = countTests(step.tests);
    const lint = Array.isArray(step.lint)
      ? step.lint.filter(
          (item) =>
            item &&
            typeof item.message === "string" &&
            typeof item.file === "string" &&
            (typeof item.ruleId === "string" || item.ruleId === null) &&
            Number.isSafeInteger(item.line),
        )
      : [];
    const labels: Partial<Record<typeof step.id, string>> = {
      lint: "書き方",
      typecheck: "型",
      format: "整形",
    };
    const label = total
      ? `テスト ${passed} / ${total}`
      : step.id === "lint" && lint.length
        ? `書き方 ${lint.length} 件`
        : (labels[step.id] ?? shortStepLabel(step.label));
    chips.push({ label, status: step.status });
    for (const test of step.tests ?? []) {
      if (test.status !== "failed") continue;
      const line = input.problemTestLines?.get(test) ?? 1;
      const file = typeof test.file === "string" ? test.file : undefined;
      const safeTest = {
        ...test,
        file,
        message: typeof test.message === "string" ? test.message : undefined,
      };
      details.push(
        renderFailedTest(
          safeTest,
          file && run.problemId
            ? problemFileLocation(input.root, run.problemId, file, line)
            : undefined,
        ),
      );
    }
    for (const { file, line, ruleId, message } of lint) {
      const location = run.problemId
        ? problemFileLocation(input.root, run.problemId, file, Math.max(line, 1))
        : "";
      details.push(
        `<p>${escapeHtml(message)}${ruleId ? ` <code>${escapeHtml(ruleId)}</code>` : ""} ${location}</p>`,
      );
    }
    if (
      step.status === "error" ||
      (step.status === "failed" &&
        !lint.length &&
        !step.tests?.some(({ status }) => status === "failed"))
    ) {
      details.push(`<p>${escapeHtml(step.summary)}</p>`);
    }
  }
  return (
    stepChips(chips) +
    (details.length ? `<div class="problem-check-details">${details.join("")}</div>` : "")
  );
}

function problemNowHtml(input: TaskGuideInput, now: ReturnType<typeof problemNow>): string {
  const { root } = input;
  const card = (style: string, title: string, body = "", action = "", secondary = "") =>
    `<section class="now-card ${style}" aria-label="いまやること"><p class="now-label">いまやること</p><h2 class="now-title">${title}</h2>${body}${action ? `<p class="actions">${action}${secondary ? ` ${secondary}` : ""}</p>` : ""}</section>`;
  if (now.kind === "done")
    return card(
      "passed",
      input.problemResults?.taskPassed ? "この課題に合格しました" : "全部の問題を提出しました",
      "",
      input.stageId
        ? link("stella.openTaskWebPage", [input.stageId], "Web で次の課題を選ぶ", "button")
        : "",
    );
  if (now.kind === "video") {
    const { next, item } = now;
    const video = next.refs?.find(({ auto, lessonId }) => auto && lessonId === next.afterLessonId);
    const stageId = video?.stageId ?? input.stageId;
    const lessonId = next.afterLessonId;
    return card(
      "video",
      next.afterTitle ? `動画『${escapeHtml(next.afterTitle)}』を見る` : "指定された動画を見る",
      `<p>解ける問題はすべて提出しました。動画を見終えると、${item.label}『${escapeHtml(item.title)}』がここに出ます。</p>`,
      stageId && lessonId
        ? link("stella.openTaskWebPage", [stageId, lessonId], "動画を開く", "button")
        : link("stella.showTaskReadme", [root], "表示を更新する", "button"),
    );
  }
  if (!now.current)
    return card(
      "waiting",
      "問題を準備しています",
      `<p>${escapeHtml(input.releaseError ?? input.problemPreparationError ?? input.nextProblemReason ?? "解放の状態を確かめるには、表示を更新してください。")}</p>`,
      link("stella.showTaskReadme", [root], "表示を更新する", "button"),
    );
  const { id, label, title, source } = now.current;
  const submit = (text: string) => link("stella.submitTask", [root, id], text, "button");
  if (now.kind === "error")
    return card(
      "error",
      "環境の問題で確認できませんでした",
      problemChecks(input, now.run),
      submit("もう一度 確認して提出"),
      consultLink(root, id),
    );
  if (now.kind === "failed")
    return card(
      "failed",
      `${label} に直すところがあります`,
      `${problemChecks(input, now.run)}<p>左のエディターにも波線で出ています。直して保存し、もう一度確かめます。</p>`,
      submit("もう一度 確認して提出"),
      consultLink(root, id),
    );
  if (now.kind === "passed")
    return card(
      "passed",
      `${label} は確認が通りましたが、まだ提出していません`,
      problemChecks(input, now.run),
      submit("提出する"),
    );
  const file = link(
    "stella.openTaskFile",
    [root, source],
    `<code>${escapeHtml(source ?? "")}</code>`,
  );
  return card(
    "edit",
    `${label} ${escapeHtml(title)}`,
    `<p>左の ${file} に書いて保存したら、確認して提出します。</p>`,
    submit("確認して提出"),
  );
}

function checkProgressSlot(check: TaskCheckView | undefined): string {
  return `<div id="check-progress">${check ? checkProgressHtml(check.progress, check) : ""}</div>`;
}

function buildProblemGuideHtml(input: TaskGuideInput): string {
  const { root, manifest, problemResults, helpLabel } = input;
  const items = guideProblems(input);
  const now = problemNow(input, items);
  const activeId = now.current?.id ?? (now.kind === "video" ? now.item.id : undefined);
  const refs = problemResults?.problems.find(({ id }) => id === activeId)?.refs;
  const help = helpLabel ? `${link("stella.showTaskHelp", [root], escapeHtml(helpLabel))} ・ ` : "";
  return [
    `<header class="problem-header"><h1>${escapeHtml(manifest.title)}</h1>${link("stella.showTaskReadme", [root], "表示を更新する")}</header>`,
    '<div class="guide problem-guide">',
    problemProgressHtml(items, now),
    checkProgressSlot(input.check),
    problemNowHtml(input, now),
    problemTestExamplesHtml(input, now),
    input.releaseError ? `<p>${escapeHtml(input.releaseError)}</p>` : "",
    problemRefsHtml(refs),
    `<footer><p class="help">${help}${consultLink(root, now.current?.id)} ・ ${logLink()}</p>${problemRefsHtml(problemResults?.refs)}</footer>`,
    "</div>",
  ].join("\n");
}

/** 課題文のパネルの先頭に出す「進め方」。 */
export function buildTaskGuideHtml(input: TaskGuideInput): string {
  if (input.manifest.problems?.length) return buildProblemGuideHtml(input);
  const { step, card } = taskProgress(input);
  const steps = GUIDE_STEPS.map((label, i) => {
    if (i < step) return `<li class="done">${label}</li>`;
    if (i === step) return `<li class="now" aria-current="step">${label}</li>`;
    return `<li>${label}</li>`;
  }).join("");
  return [
    '<section class="guide" aria-label="この課題の進め方">',
    `<ol class="stepper">${steps}</ol>`,
    checkProgressSlot(input.check),
    card,
    '<details class="all-steps"><summary>進め方をすべて見る</summary><ol>',
    "<li><strong>課題文を読む</strong> — 下の課題文で、作るものと、確かめられる条件を読みます。</li>",
    "<li><strong>ファイルを編集して保存する</strong></li>",
    "<li><strong>提出する</strong> — 確認が自動で走り、通ったら振り返りを書いて送ります。レビューで合格すると、この課題は完了です。レビューの結果は Web に通知が届き、「レビューの結果」でも読めます。</li>",
    `</ol><p>確認だけしたいときは、エディターの右上のビーカーか「${link("stella.runTask", [input.root], "STELLA: 課題を確認する")}」を使います。</p>`,
    `<p>はじめての方は「${link("stella.openWalkthrough", [], "課題の進め方を見る")}」をどうぞ。</p></details>`,
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
    .now-card.review { border-left-color: var(--vscode-editorWarning-foreground); }
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
    .first, .rest { font-size: 0.9em; color: var(--vscode-descriptionForeground); }${RUN_SUMMARY_CSS}
    .all-steps { margin-top: 0.6rem; }
    .all-steps summary { cursor: pointer; }
    kbd {
      padding: 0 0.3rem;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family);
      font-size: 0.9em;
    }
    .files { color: var(--vscode-descriptionForeground); }
    .count { margin: 0.25rem 0; font-weight: bold; }
    .problem-header, .problem-count {
      display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.3rem 1rem;
    }
    .problem-header a, .problem-count, .problem-refs { font-size: 0.9em; }
    .problem-progress { display: flex; gap: 0.55rem; }
    .problem-cells { display: flex; gap: 3px; flex-wrap: wrap; }
    .problem-cells:first-child { flex: 0 1 auto; min-width: 0; }
    .problem-cell {
      display: block; width: 0.85rem; height: 0.55rem; border-radius: 2px; box-sizing: border-box;
      background: var(--vscode-panel-border);
      border: 1px solid var(--vscode-contrastBorder, transparent);
    }
    .problem-cell.locked { background: var(--vscode-editor-inactiveSelectionBackground); }
    .problem-cell.submitted { background: var(--vscode-testing-iconPassed); }
    .problem-cell.current { background: var(--vscode-focusBorder); }
    .problem-cell.failed { background: var(--vscode-testing-iconFailed); }
    .problem-count { color: var(--vscode-descriptionForeground); margin: 0.3rem 0 0.9rem; }
    .problem-count strong { color: var(--vscode-foreground); }
    .problem-guide .now-title { margin: 0.25rem 0; }
    .problem-guide .now-label, .problem-refs { color: var(--vscode-descriptionForeground); }
    .problem-check-details { max-height: 16rem; overflow: auto; overflow-wrap: anywhere; }
    .test-examples-title { font-size: 1em; margin: 1rem 0 0.25rem; }
    .test-examples { width: 100%; table-layout: auto; border-collapse: collapse; margin: 0 0 0.6rem; }
    .test-examples th, .test-examples td {
      border-bottom: 1px solid var(--vscode-panel-border);
      text-align: left; padding: 0.2rem 0.4rem; vertical-align: top;
    }
    .test-examples code, .test-example-types code { overflow-wrap: anywhere; }
    .test-example-types, .test-examples-more { margin: 0.25rem 0 0.6rem; }
    .problem-guide footer { border-top: 1px solid var(--vscode-panel-border); padding-top: 0.4rem; }
    .help { margin: 0.5rem 0 0.25rem; }
    .readme-title { margin-top: 1.5rem; }`;
