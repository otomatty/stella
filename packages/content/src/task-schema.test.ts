import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { problemFingerprints } from "../../shared/src/tasks/problems.js";
import { checkSourceReferences, unitContentHash } from "./check-source-references.js";
import { buildContentManifest } from "./manifest.js";
import { parseTaskDefinition, toRuntimeManifest } from "./task-schema.js";

const content = join(dirname(fileURLToPath(import.meta.url)), "..");
const taskFile = join(
  content,
  "stages/dev-env-basics/modules/u02-first-task/tasks/q01-first-page/task.json",
);
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function problemTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "dev-env-basics/u02-first-task/q02-problems",
    title: "問題",
    kind: "basic",
    pattern: "html-page",
    skills: { uses: ["html-document"], assesses: ["preview-changes"] },
    runner: "node-test",
    environment: "static-web-01",
    submit: { files: ["src/**/*.ts"], explanation: false, debuggingRecord: false },
    support: { hintLevels: 0, solutionUnlock: "passed" },
    sources: ["SRC-mdn-html-20261005"],
    estimatedMinutes: 10,
    protected: ["tests/**", "src/shared/**"],
    checks: { lint: false, format: false },
    problems: [
      { id: "q01-add-tax", title: "税込価格を返す" },
      { id: "q02-split-bill", title: "割り勘" },
    ],
    ...overrides,
  };
}

describe("課題の AI への相談", () => {
  it("support.aiChat: false を定義に残し、省略した課題には足さない", () => {
    const parsed = parseTaskDefinition(
      problemTask({ support: { ...problemTask().support, aiChat: false } }),
      {},
    );
    expect(parsed.support.aiChat).toBe(false);
    expect(parseTaskDefinition(problemTask(), {}).support).not.toHaveProperty("aiChat");
  });

  it.each([true, null, 0, "false", {}, []].map((aiChat) => ({ aiChat })))(
    "support.aiChat の $aiChat は受け付けない",
    ({ aiChat }) => {
      expect(() =>
        parseTaskDefinition(problemTask({ support: { ...problemTask().support, aiChat } }), {}),
      ).toThrow("support.aiChat: 無効にする課題にだけ false と書いてください");
    },
  );
});

describe("問題つきの課題の定義", () => {
  it("課題と問題で手がかりを書け、実行用 manifest からは外す", () => {
    const refs = ["1-2-3", "u01-let-const/l2-loops", "other:1-2-3", "other:u01-let-const/l2-loops"];
    const problems = problemTask().problems.map((problem) => ({ ...problem, refs }));
    const parsed = parseTaskDefinition(problemTask({ refs, problems }), {});
    expect(parsed.refs).toEqual(refs);
    expect(parsed.problems).toEqual(problems);
    expect(toRuntimeManifest(parsed, {})).toEqual(
      toRuntimeManifest(parseTaskDefinition(problemTask(), {}), {}),
    );
  });

  it.each([
    { refs: null, value: "null" },
    { refs: [""], value: '""' },
    { refs: ["../lesson"], value: "../lesson" },
    { refs: ["other:bad:1-2-3"], value: "other:bad:1-2-3" },
    { refs: ["1-2-3", "1-2-3"], value: "1-2-3" },
    { refs: ["1-2-3", "dev-env-basics:1-2-3"], value: "dev-env-basics:1-2-3" },
  ])("不正な手がかり $value を課題 ID と値を示して拒む", ({ refs, value }) => {
    const parse = () => parseTaskDefinition(problemTask({ refs }), {});
    expect(parse).toThrow("dev-env-basics/u02-first-task/q02-problems の refs");
    expect(parse).toThrow(value);
  });

  it.each(["1-2-3", "dev-env-basics:1-2-3"])("after と同じ手がかり %s を拒む", (ref) => {
    const problems = problemTask().problems.map((problem) => ({
      ...problem,
      after: "1-2-3",
      refs: [ref],
    }));
    expect(() => parseTaskDefinition(problemTask({ problems }), {})).toThrow(
      `dev-env-basics/u02-first-task/q02-problems の問題 q01-add-tax の refs に after と同じレッスンは書けません: ${ref}`,
    );
  });

  it("review を省き、実行用の定義に problems だけを足す", () => {
    const parsed = parseTaskDefinition(problemTask(), {});
    expect(parsed.review).toEqual({ rubric: [], escalateWhen: [] });
    expect(parsed.problems).toEqual(problemTask().problems);
    const runtime = toRuntimeManifest(parsed, {});
    expect(runtime.problems).toEqual(parsed.problems);
    expect(runtime).not.toHaveProperty("review");
    const plain = parseTaskDefinition(JSON.parse(readFileSync(taskFile, "utf8")), {});
    expect(toRuntimeManifest(plain, {})).not.toHaveProperty("problems");
    expect(plain).not.toHaveProperty("problems");
  });

  it("全問の after を教材の定義に残し、配布には problemSteps だけを足す", () => {
    const problems = problemTask().problems.map((problem) => ({ ...problem, after: "1-1-7" }));
    const parsed = parseTaskDefinition(problemTask({ problems }), {});
    expect(parsed.problems).toEqual(problems);
    expect(toRuntimeManifest(parsed, {})).toMatchObject({
      problems: problemTask().problems,
      problemSteps: true,
    });
    expect(toRuntimeManifest(parsed, {}).problems).toEqual(problemTask().problems);
    expect(toRuntimeManifest(parseTaskDefinition(problemTask(), {}), {})).not.toHaveProperty(
      "problemSteps",
    );
    expect(() =>
      parseTaskDefinition(problemTask({ problems: [problems[0], problemTask().problems[1]] }), {}),
    ).toThrow("全問");
    expect(() =>
      parseTaskDefinition(problemTask({ problems: [{ ...problems[0], after: null }] }), {}),
    ).toThrow("after");
  });

  it("説明欄・修正記録・必須の評価項目を、問題つきの課題には求めない", () => {
    const support = { hintLevels: 0, solutionUnlock: "passed" };
    const submit = { files: ["src/**/*.ts"], explanation: false, debuggingRecord: false };
    expect(
      parseTaskDefinition(problemTask({ kind: "independent", support, submit }), {}).submit
        .explanation,
    ).toBe(false);
    expect(
      parseTaskDefinition(problemTask({ kind: "debug", support, submit }), {}).submit
        .debuggingRecord,
    ).toBe(false);
    expect(
      parseTaskDefinition(
        problemTask({
          review: { rubric: [], escalateWhen: [] },
        }),
        {},
      ).review,
    ).toEqual({ rubric: [], escalateWhen: [] });
  });

  it("問題の無い課題は review と説明欄を今までどおり求める", () => {
    const { problems: _problems, ...without } = problemTask();
    expect(() => parseTaskDefinition(without, {})).toThrow("review");
    expect(() =>
      parseTaskDefinition(
        problemTask({
          problems: undefined,
          kind: "independent",
          review: {
            rubric: [{ id: "done", criterion: "動く", required: true }],
            escalateWhen: [],
          },
        }),
        {},
      ),
    ).toThrow("説明欄");
    expect(() =>
      parseTaskDefinition(
        problemTask({
          problems: [{ id: "..", title: "外" }],
        }),
        {},
      ),
    ).toThrow("id");
    expect(() =>
      parseTaskDefinition(
        problemTask({ runner: "static-preview", problems: [{ id: "a", title: "題" }] }),
        {},
      ),
    ).toThrow("vitest");
  });
});

describe("問題つきの課題のファイル", () => {
  const unit = "stages/dev-env-basics/modules/u02-first-task/tasks/q02-problems";

  function place(files: Record<string, string>, task: Record<string, unknown> = problemTask()) {
    const root = mkdtempSync(join(tmpdir(), "stella-problem-task-"));
    roots.push(root);
    mkdirSync(join(root, "stages"));
    cpSync(join(content, "stages/dev-env-basics"), join(root, "stages/dev-env-basics"), {
      recursive: true,
    });
    for (const name of ["skills.json", "patterns.json", "environments", "sources"]) {
      cpSync(join(content, name), join(root, name), { recursive: true });
    }
    const body: Record<string, string> = {
      "hints.md": "",
      "starter/src/q01-add-tax.ts": "export const tax = 1;\n",
      "starter/src/q02-split-bill.ts": "export const split = 1;\n",
      "starter/src/shared/util.ts": "export const shared = 1;\n",
      "tests/q01-add-tax.test.ts": "export {};\n",
      "tests/q02-split-bill.test.ts": "export {};\n",
      "private/solution/src/q01-add-tax.ts": "export const tax = 1;\n",
      "private/solution/src/q02-split-bill.ts": "export const split = 1;\n",
      "private/explanation.md": "解説\n",
      "private/review.md": "観点\n",
      "private/variants/.gitkeep": "",
      ...files,
    };
    body["task.json"] = JSON.stringify(task);
    for (const [rel, text] of Object.entries(body)) {
      const file = join(root, unit, rel);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, text);
    }
    return root;
  }

  it("問題のファイルと protected された共通ファイルを読む", () => {
    const root = place({});
    const manifest = buildContentManifest(join(root, "stages"));
    const added = manifest.tasks.find((task) => task.definition.id.endsWith("/q02-problems"));
    const plain = manifest.tasks.find((task) => task.definition.id.endsWith("/q01-first-page"));
    expect(added?.definition.problems).toHaveLength(2);
    expect(added?.definition.review).toEqual({ rubric: [], escalateWhen: [] });
    expect(added?.bundle.manifest.problems).toHaveLength(2);
    expect(added?.lessonId).toBe("task-u02-first-task-q02-problems");
    expect(manifest.stages[0].sections?.flatMap((section) => section.lessons)).toContainEqual(
      expect.objectContaining({ id: added?.lessonId }),
    );
    expect(plain?.bundle.contentHash).toBe(
      "af1c1c897fba146143de2b36ab7ae6677c41c78e7f6475b5662b1933ff9faef8",
    );
    expect(plain?.bundle.manifest).not.toHaveProperty("problems");
  });

  function build(root: string) {
    return buildContentManifest(join(root, "stages"));
  }

  it("同じ単元と前の単元の手がかりを順番に解決し、配布物と指紋を保つ", async () => {
    const root = place({});
    const before = build(root).tasks.find((t) => t.definition.id === problemTask().id);
    const problems = problemTask().problems.map((p) => ({ ...p, refs: ["0-1-1"] }));
    writeFileSync(
      join(root, unit, "task.json"),
      JSON.stringify(problemTask({ refs: ["01-1-3", "u02-first-task/l1-first-task"], problems })),
    );
    const after = build(root).tasks.find((t) => t.definition.id === problemTask().id);
    expect(after?.refs).toEqual([
      { problemId: "", position: 0, stageId: "dev-env-basics", lessonId: "01-1-3" },
      { problemId: "", position: 1, stageId: "dev-env-basics", lessonId: "doc-0-1" },
      { problemId: "q01-add-tax", position: 0, stageId: "dev-env-basics", lessonId: "0-1-1" },
      { problemId: "q02-split-bill", position: 0, stageId: "dev-env-basics", lessonId: "0-1-1" },
    ]);
    if (!before || !after) throw new Error("見本の課題がありません");
    expect(after.bundle).toEqual(before.bundle);
    expect(await problemFingerprints(after.bundle.manifest, after.bundle.files)).toEqual(
      await problemFingerprints(before.bundle.manifest, before.bundle.files),
    );
  });

  it("別のステージは前提をさかのぼり、前提外や存在しない参照先を拒む", () => {
    const root = place({});
    const stageRoot = join(root, "stages");
    for (const [slug, prerequisites] of [
      ["z-first", []],
      ["z-middle", ["z-first"]],
      ["z-outside", []],
    ] as const) {
      const stage = join(stageRoot, slug);
      const lesson = join(stage, "modules/u01/l1");
      mkdirSync(join(lesson, "t1"), { recursive: true });
      writeFileSync(join(stage, "stage.json"), JSON.stringify({ title: slug, prerequisites }));
      writeFileSync(join(lesson, "doc.md"), "# まとめ");
      writeFileSync(join(lesson, "practice.md"), "");
      writeFileSync(
        join(lesson, "t1/slides.md"),
        "---\nid: 1-2-3\ntitle: 動画\ntakeaway: 要点\n---\n# 動画\n",
      );
    }
    const entryStage = join(stageRoot, "dev-env-basics");
    const configPath = join(entryStage, "stage.json");
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    writeFileSync(configPath, JSON.stringify({ ...config, prerequisites: ["z-middle"] }));
    for (const unit of ["u00-start", "u01-vscode-setup"]) {
      const path = join(entryStage, "modules", unit, "unit.json");
      const config = JSON.parse(readFileSync(path, "utf8"));
      writeFileSync(path, JSON.stringify({ ...config, public: false }));
    }
    const setRefs = (...refs: string[]) =>
      writeFileSync(join(root, unit, "task.json"), JSON.stringify(problemTask({ refs })));
    setRefs("z-first:1-2-3", "z-middle:u01/l1");
    expect(build(root).tasks.find((t) => t.definition.id === problemTask().id)?.refs).toEqual([
      { problemId: "", position: 0, stageId: "z-first", lessonId: "1-2-3" },
      { problemId: "", position: 1, stageId: "z-middle", lessonId: "doc-1-2" },
    ]);

    setRefs("z-outside:1-2-3");
    expect(() => build(root)).toThrow(/q02-problems.*前提.*z-outside:1-2-3/);
    setRefs("z-absent:1-2-3");
    expect(() => build(root)).toThrow(/q02-problems.*存在しないステージ.*z-absent:1-2-3/);
    setRefs("z-first:1-2-4");
    expect(() => build(root)).toThrow(/q02-problems.*存在しないレッスン.*z-first:1-2-4/);
    setRefs("u02-first-task/l9-missing");
    expect(() => build(root)).toThrow(
      /q02-problems.*存在しないレッスン.*u02-first-task\/l9-missing/,
    );
  });

  it.each([{ refs: ["0-1-1"] }, { problems: [{ ...problemTask().problems[0], refs: ["0-1-1"] }] }])(
    "類題には refs を書けない",
    (patch) => {
      const root = place({});
      const variant = join(root, unit, "private/variants/v01");
      mkdirSync(variant);
      writeFileSync(
        join(variant, "task.json"),
        JSON.stringify(problemTask({ ...patch, id: "dev-env-basics/u02-first-task/v01" })),
      );
      expect(() => build(root)).toThrow(/類題.*v01.*refs.*0-1-1/);
    },
  );

  it("前の単元の動画にも問題を置き、存在しないトピックと後の単元は拒む", () => {
    const problems = problemTask().problems;
    const task = problemTask({
      problems: [
        { ...problems[0], after: "0-1-1" },
        { ...problems[1], after: "01-1-3" },
      ],
    });
    const root = place({}, task);
    const sections = build(root).stages[0].sections;
    const earlier = sections?.find((section) => section.id === "u01-vscode-setup")?.lessons ?? [];
    const video = earlier.findIndex((lesson) => lesson.id === "01-1-3");
    expect(earlier.slice(video, video + 2).map((lesson) => lesson.id)).toEqual([
      "01-1-3",
      "problem-u02-first-task-q02-problems-q02-split-bill",
    ]);
    expect(earlier[video + 1].markdown).toBe("# 問2 割り勘");

    const taskFile = join(root, unit, "task.json");
    writeFileSync(
      taskFile,
      JSON.stringify({
        ...task,
        problems: [{ ...problems[0], after: "unknown" }, task.problems[1]],
      }),
    );
    expect(() => build(root)).toThrow(/after.*unknown/);

    writeFileSync(taskFile, JSON.stringify(task));
    const laterUnit = join(root, "stages/dev-env-basics/modules/u03-later");
    mkdirSync(laterUnit);
    cpSync(
      join(root, "stages/dev-env-basics/modules/u02-first-task/l1-first-task"),
      join(laterUnit, "l1-first-task"),
      { recursive: true },
    );
    cpSync(
      join(root, "stages/dev-env-basics/modules/u02-first-task/unit.json"),
      join(laterUnit, "unit.json"),
    );
    const laterReferences = JSON.parse(
      readFileSync(
        join(root, "stages/dev-env-basics/modules/u02-first-task/references.json"),
        "utf8",
      ),
    );
    laterReferences.unitId = "dev-env-basics/u03-later@1";
    writeFileSync(join(laterUnit, "references.json"), JSON.stringify(laterReferences));
    const laterSlides = join(laterUnit, "l1-first-task/t1-edit-save/slides.md");
    writeFileSync(
      laterSlides,
      readFileSync(laterSlides, "utf8").replace('id: "0-1-1"', 'id: "later-video"'),
    );
    writeFileSync(
      taskFile,
      JSON.stringify({
        ...task,
        problems: [{ ...problems[0], after: "later-video" }, task.problems[1]],
      }),
    );
    expect(() => build(root)).toThrow(/after.*later-video/);

    writeFileSync(
      laterSlides,
      readFileSync(laterSlides, "utf8").replace('id: "later-video"', 'id: "9-9-9"'),
    );
    writeFileSync(taskFile, JSON.stringify(problemTask({ refs: ["9-9-9"] })));
    expect(() => build(root)).toThrow(/q02-problems.*同じ単元か前の単元.*9-9-9/);
  });

  it("問題つきの課題に README.md を置けない", () => {
    const root = place({ "README.md": "課題\n" });
    expect(() => build(root)).toThrow(
      /問題つきの課題には README\.md を置きません。.*\/\/ 問N.*refs.*dev-env-basics\/u02-first-task\/q02-problems/,
    );
  });

  it("問題つきの類題に README.md を置けない", () => {
    const root = place({
      "private/variants/v01/README.md": "類題\n",
      "private/variants/v01/task.json": JSON.stringify(
        problemTask({ id: "dev-env-basics/u02-first-task/v01" }),
      ),
    });
    expect(() => build(root)).toThrow(
      /問題つきの課題には README\.md を置きません。.*dev-env-basics\/u02-first-task\/v01/,
    );
  });

  it("README の無い問題つきの課題にも問題一覧のレッスンと参照元の対応がある", () => {
    const root = place({}, problemTask({ environment: "static-web-02" }));
    const manifest = build(root);
    const task = manifest.tasks.find((t) => t.definition.id === problemTask().id);
    expect(task?.bundle.files).not.toHaveProperty("README.md");
    expect(task?.lessonId).toBe("task-u02-first-task-q02-problems");
    expect(manifest.stages[0].sections?.flatMap((s) => s.lessons)).toContainEqual(
      expect.objectContaining({
        id: task?.lessonId,
        title: "問題の問題",
        duration: "2 問",
        markdown: expect.stringMatching(/^\s*## 単元の参照元\n/),
      }),
    );

    const unitDir = dirname(dirname(join(root, unit)));
    const referencesPath = join(unitDir, "references.json");
    const references = JSON.parse(readFileSync(referencesPath, "utf8"));
    const original = references.uses.find(
      (use: { contentId: string }) => use.contentId === "tasks/q01-first-page/README.md",
    );
    references.uses.push({ ...original, contentId: "tasks/q02-problems/README.md" });
    references.contentHash = unitContentHash(unitDir);
    writeFileSync(referencesPath, JSON.stringify(references));
    expect(
      checkSourceReferences(root).filter(
        ({ unitId, severity }) => unitId.endsWith("/u02-first-task") && severity === "error",
      ),
    ).toEqual([]);

    rmSync(join(unitDir, "tasks/q01-first-page/README.md"));
    expect(() => build(root)).toThrow(/README\.md が必要です.*q01-first-page/);
  });

  it("問題つきの課題は private/review.md が無くても読める", () => {
    const root = place({});
    rmSync(join(root, unit, "private/review.md"));
    const manifest = build(root);
    const added = manifest.tasks.find((task) => task.definition.id.endsWith("/q02-problems"));
    expect(added?.definition.problems).toHaveLength(2);
    expect(added?.privateFiles["review.md"]).toBeUndefined();
    expect(added?.privateFiles["explanation.md"]).toBeDefined();
  });

  it("一覧に無いファイル・足りない解答例・protected に入っていない共通ファイルを落とす", () => {
    expect(() => build(place({ "starter/src/extra.ts": "export {};\n" }))).toThrow("一覧にない");
    const missing = place({});
    rmSync(join(missing, unit, "private/solution/src/q02-split-bill.ts"));
    expect(() => build(missing)).toThrow("q02-split-bill");
    const { protected: _protected, ...task } = problemTask();
    expect(() => build(place({}, { ...task, protected: ["tests/**"] }))).toThrow("protected");
  });
});
