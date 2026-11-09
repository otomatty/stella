import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
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
      "README.md": "課題\n",
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
    expect(plain?.bundle.contentHash).toBe(
      "41f855c1a985a815417a9e9abea03d3f671ad359e271eeb319eb1a1f570cec8a",
    );
    expect(plain?.bundle.manifest).not.toHaveProperty("problems");
  });

  function build(root: string) {
    return buildContentManifest(join(root, "stages"));
  }

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
