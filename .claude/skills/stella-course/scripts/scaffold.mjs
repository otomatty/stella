/**
 * runner のテンプレートから課題フォルダーの下書きを置く。
 * 既存の課題フォルダーは上書きしない。外部プロセスは起動しない。
 *
 * node <このファイル> task --content <packages/content> --stages <stages> \
 *   --stage <slug> --unit <単元> --task <課題> --runner <runner> --kind <kind> --title <題>
 * node <このファイル> help
 */

import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const KINDS = [
  "basic",
  "connection",
  "independent",
  "debug",
  "integration",
  "assessment-a",
  "assessment-b",
];

const HELP = `使い方:
  node scripts/scaffold.mjs task \\
    --content <packages/content のパス> --stages <stages のパス> \\
    --stage <slug> --unit <単元フォルダー> --task <課題フォルダー> \\
    --runner <runner> --kind <kind> --title <題>
  node scripts/scaffold.mjs help

STELLA 本体の --content は packages/content、--stages は packages/content/stages。
外部リポジトリでは --content .stella/packages/content、--stages stages。旧い courses/ のリポジトリでは --stages courses。
templates/runners/<runner>/ の starter と tests を課題へ写し、task.json の下書きを書く。
既存の課題フォルダーがあるときは何も書かずに止まる。
`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function segment(value, label) {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(value)) {
    fail(
      `${label} は英小文字・数字で始め、続けて英小文字・数字・.・_・- だけにしてください: ${value}`,
    );
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) fail(`不明な引数です: ${arg}\n${HELP}`);
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) fail(`${arg} に値が必要です`);
    out[key] = value;
    i++;
  }
  return out;
}

function isStringList(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim());
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function firstId(file) {
  if (!existsSync(file)) return undefined;
  const raw = readJson(file);
  if (!Array.isArray(raw)) return undefined;
  for (const item of raw) {
    if (typeof item === "object" && item !== null && "id" in item && typeof item.id === "string") {
      const id = item.id.trim();
      if (id) return id;
    }
  }
  return undefined;
}

function readSibling(file) {
  const raw = readJson(file);
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
  if (typeof raw.pattern !== "string" || !raw.pattern.trim()) return undefined;
  const skills = raw.skills;
  if (typeof skills !== "object" || skills === null || Array.isArray(skills)) return undefined;
  if (!isStringList(skills.uses) || !isStringList(skills.assesses)) return undefined;
  if (!Array.isArray(raw.sources) || raw.sources.some((id) => typeof id !== "string")) {
    return undefined;
  }
  return {
    pattern: raw.pattern.trim(),
    skills: { uses: skills.uses, assesses: skills.assesses },
    sources: raw.sources,
  };
}

function siblingDraft(tasksDir, taskName) {
  if (!existsSync(tasksDir)) return undefined;
  for (const name of readdirSync(tasksDir).sort()) {
    if (name === taskName) continue;
    const file = join(tasksDir, name, "task.json");
    if (!existsSync(file)) continue;
    const draft = readSibling(file);
    if (draft) return draft;
  }
  return undefined;
}

function unitSource(referencesFile) {
  if (!existsSync(referencesFile)) return undefined;
  const raw = readJson(referencesFile);
  if (typeof raw !== "object" || raw === null || !Array.isArray(raw.uses)) return undefined;
  for (const use of raw.uses) {
    if (typeof use !== "object" || use === null || !Array.isArray(use.sourceRefs)) continue;
    const id = use.sourceRefs.find((item) => typeof item === "string" && item.trim());
    if (typeof id === "string") return id;
  }
  return undefined;
}

function provisional(content, stages, stage, unit, taskName) {
  const tasksDir = join(stages, stage, "modules", unit, "tasks");
  const sibling = siblingDraft(tasksDir, taskName);
  if (sibling) return sibling;
  const pattern = firstId(join(content, "patterns.json"));
  const skill = firstId(join(content, "skills.json"));
  if (!pattern || !skill) {
    fail(
      "仮の pattern と skills を取れません。同じ単元に課題を置くか、content の patterns.json と skills.json を読める状態にしてください。",
    );
  }
  const source = unitSource(join(stages, stage, "modules", unit, "references.json"));
  return {
    pattern,
    skills: { uses: [skill], assesses: [skill] },
    sources: source ? [source] : [],
  };
}

function supportFor(kind) {
  if (kind === "basic" || kind === "connection") {
    return { hintLevels: 2, solutionUnlock: "after-hints" };
  }
  if (kind === "independent" || kind === "debug") {
    return { hintLevels: 2, solutionUnlock: "attempts-or-passed" };
  }
  return { hintLevels: 0, solutionUnlock: "passed" };
}

function hintsMarkdown(levels) {
  if (levels === 0) return "<!-- 確認と統合の課題はヒントを置きません。 -->\n";
  const sections = [];
  for (let level = 1; level <= levels; level++) {
    const title = level === 1 ? "方針" : "手がかりのコード";
    const body =
      level === 1
        ? "課題文の入力と出力に合う処理を、編集するファイルに書きます。"
        : "テンプレートの例を、この課題の入出力に合わせて書き換えます。";
    sections.push(`## ヒント${level} ${title}\n\n${body}`);
  }
  return `${sections.join("\n\n")}\n`;
}

function assertNoSymlink(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) fail(`テンプレートにシンボリックリンクがあります: ${path}`);
    if (stat.isDirectory()) assertNoSymlink(path);
  }
}

function readFields(templateDir, runner) {
  const file = join(templateDir, "task-fields.json");
  if (!existsSync(file)) fail(`task-fields.json がありません: ${file}`);
  const fields = readJson(file);
  if (typeof fields !== "object" || fields === null || Array.isArray(fields)) {
    fail("task-fields.json はオブジェクトにしてください");
  }
  if (fields.runner !== runner) {
    fail(`task-fields.json の runner (${String(fields.runner)}) が --runner ${runner} と違います`);
  }
  if (typeof fields.environment !== "string" || !fields.environment.trim()) {
    fail("task-fields.json の environment がありません");
  }
  const files = fields.submit?.files;
  if (!isStringList(files)) fail("task-fields.json の submit.files がありません");
  if (!Array.isArray(fields.protected)) fail("task-fields.json の protected がありません");
  if (typeof fields.checks !== "object" || fields.checks === null) {
    fail("task-fields.json の checks がありません");
  }
  return fields;
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command === undefined || command === "help" || command === "--help") {
    console.info(HELP);
    return;
  }
  if (command !== "task") fail(`不明なコマンドです: ${command}\n${HELP}`);
  const args = parseArgs(rest);
  for (const key of ["content", "stages", "stage", "unit", "task", "runner", "kind", "title"]) {
    if (!args[key] || !String(args[key]).trim()) fail(`--${key} が必要です\n${HELP}`);
  }
  const { content, stages, stage, unit, task, runner, kind, title } = args;
  segment(stage, "--stage");
  segment(unit, "--unit");
  segment(task, "--task");
  segment(runner, "--runner");
  if (task.endsWith("-fixed-start")) fail("--task を -fixed-start で終わらせることはできません");
  if (!KINDS.includes(kind)) fail(`--kind は ${KINDS.join(" / ")} のどれかにしてください`);

  const templateDir = join(content, "templates", "runners", runner);
  const starterDir = join(templateDir, "starter");
  const testsDir = join(templateDir, "tests");
  if (!existsSync(starterDir) || !existsSync(testsDir)) {
    fail(
      `テンプレートがありません: ${templateDir} (static-preview と env-diagnose は見本の課題から写します)`,
    );
  }
  const fields = readFields(templateDir, runner);
  assertNoSymlink(templateDir);

  const taskDir = join(stages, stage, "modules", unit, "tasks", task);
  if (existsSync(taskDir)) fail(`課題フォルダーが既にあります。上書きしません: ${taskDir}`);

  const picked = provisional(content, stages, stage, unit, task);
  const support = supportFor(kind);
  const explanation = ["independent", "integration", "assessment-a", "assessment-b"].includes(kind);
  const definition = {
    id: `${stage}/${unit}/${task}`,
    title: title.trim(),
    kind,
    pattern: picked.pattern,
    skills: picked.skills,
    runner: fields.runner,
    environment: fields.environment,
    submit: {
      files: fields.submit.files,
      explanation,
      debuggingRecord: kind === "debug",
    },
    review: {
      rubric: [
        {
          id: "meets-spec",
          criterion: "課題文の入出力と制約を満たしている",
          required: true,
        },
      ],
      escalateWhen: [],
    },
    support,
    sources: picked.sources,
    estimatedMinutes: 45,
    protected: fields.protected,
    checks: fields.checks,
    ...(fields.ci ? { ci: fields.ci } : {}),
  };

  mkdirSync(taskDir, { recursive: true });
  cpSync(starterDir, join(taskDir, "starter"), { recursive: true });
  cpSync(testsDir, join(taskDir, "tests"), { recursive: true });
  cpSync(starterDir, join(taskDir, "private", "solution"), { recursive: true });
  writeFileSync(join(taskDir, "task.json"), `${JSON.stringify(definition, null, 2)}\n`);
  const edited = fields.submit.files.map((file) => `\`${file}\``).join("、");
  writeFileSync(
    join(taskDir, "README.md"),
    `# ${title.trim()}\n\n入力、出力、制約、例を書きます。受講者が編集するファイルは ${edited} です。\n`,
  );
  writeFileSync(join(taskDir, "hints.md"), hintsMarkdown(support.hintLevels));
  mkdirSync(join(taskDir, "private", "variants"), { recursive: true });
  writeFileSync(join(taskDir, "private", "variants", ".gitkeep"), "");
  writeFileSync(
    join(taskDir, "private", "explanation.md"),
    "# 解説\n\n合格後に読む解説を書きます。\n",
  );
  writeFileSync(
    join(taskDir, "private", "review.md"),
    "# レビュー\n\nAI と講師が見る点を書きます。受講者には返しません。\n",
  );
  console.info(taskDir);
}

main();
