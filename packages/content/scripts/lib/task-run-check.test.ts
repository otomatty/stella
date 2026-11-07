import type { GitCheck, TaskManifest } from "../../../shared/src/tasks/manifest.js";
import type { TaskSeed } from "../../src/task-content.js";
import { describe, expect, it, vi } from "vitest";
import { mutantsFail, solutionPasses } from "./task-run-check.js";

const base64 = (text: string) => Buffer.from(text).toString("base64");
const checks: GitCheck[] = [
  { type: "learning-folder-root" },
  { type: "local-identity" },
  { type: "committed", paths: ["notes.txt", ".stella/task.json", ".stella/distribution.json"] },
  { type: "commit-count", min: 3 },
  { type: "ignored", path: "node_modules/probe" },
  { type: "ignored", path: ".stella/last-run.json" },
  { type: "ignored", path: ".stella/dotnet/output" },
];

/** 教材を読まず、配布物と解答例を持つ課題を組み立てる。 */
function fixture(runner: TaskManifest["runner"]): TaskSeed {
  const manifest: TaskManifest = {
    schemaVersion: 1,
    id: "dev-env-basics/u06-git/q01-record",
    title: "記録",
    kind: "basic",
    runner,
    submit: { files: runner === "env-diagnose" ? [] : ["notes.txt"] },
    protected: [],
    checks: { lint: false, format: false },
    environment: { id: "diagnose-test@1", git: { min: "1.0.0" } },
    ...(runner === "git-record"
      ? {
          git: { checks },
          static: {
            checks: [
              { type: "file-absent" as const, path: ".stella-mutant.json" },
              { type: "file-contains" as const, path: "notes.txt", text: "solution" },
            ],
          },
        }
      : {}),
  };
  return {
    stageId: "dev-env-basics",
    unitId: "u06-git",
    lessonId: null,
    directory: "unused",
    definition: {
      ...manifest,
      environment: "diagnose-test",
      pattern: "record",
      skills: { uses: [], assesses: [] },
      submit: { ...manifest.submit, explanation: false, debuggingRecord: false },
      review: { rubric: [], escalateWhen: [] },
      support: { hintLevels: 0, solutionUnlock: "passed" },
      sources: [],
      estimatedMinutes: 10,
    },
    bundle: {
      manifest,
      contentHash: "",
      files: {
        "notes.txt": base64("starter\n"),
        ".stella/task.json": base64(JSON.stringify(manifest)),
        ".stella/distribution.json": base64("{}\n"),
      },
    },
    privateFiles: { "solution/notes.txt": base64("solution\n") },
  };
}

describe("env-diagnose の教材検査", () => {
  it("機械の版を調べる手順を動かさず通る", async () => {
    const task = fixture("env-diagnose");
    const run = vi.fn().mockRejectedValue(new Error("動かしてはいけない"));
    await solutionPasses(task, task.bundle.files, "配布ファイル", { run, env: { PATH: "" } });
    expect(await mutantsFail(task, { run })).toBe(0);
    expect(run).not.toHaveBeenCalled();
  });

  it("submit.files があれば落ちる", async () => {
    const task = fixture("env-diagnose");
    task.bundle.manifest.submit.files = ["notes.txt"];
    await expect(solutionPasses(task, task.bundle.files, "配布ファイル")).rejects.toThrow(
      "submit.files",
    );
  });

  it("誤答があれば両方の入口で落ちる", async () => {
    const task = fixture("env-diagnose");
    task.mutants = { bad: {} };
    await expect(solutionPasses(task, task.bundle.files, "配布ファイル")).rejects.toThrow(
      "誤答は置けません",
    );
    await expect(mutantsFail(task)).rejects.toThrow("誤答は置けません");
  });

  it.each(["missing", "different-id", "no-tools"])(
    "環境定義が不十分なら落ちる: %s",
    async (mode) => {
      const task = fixture("env-diagnose");
      task.bundle.manifest.environment =
        mode === "missing"
          ? undefined
          : {
              id: mode === "different-id" ? "other@1" : "diagnose-test@1",
              ...(mode === "no-tools" ? {} : { git: { min: "1.0.0" } }),
            };
      await expect(solutionPasses(task, task.bundle.files, "配布ファイル")).rejects.toThrow(
        "environments/",
      );
    },
  );
});

describe("git-record の教材検査", () => {
  it("学習フォルダーのルート・local identity・課題のコミット数・共有の gitignore を本物の Git で検査する", async () => {
    const task = fixture("git-record");
    await expect(
      solutionPasses(task, task.bundle.files, "配布ファイル", {
        env: {
          ...process.env,
          GIT_DIR: "missing-repository",
          GIT_CONFIG_GLOBAL: "missing-global-config",
          GIT_CONFIG_COUNT: "invalid",
        },
      }),
    ).resolves.toBeUndefined();
  });

  it.each([
    ["skipCommit", ["committed", "commit-count"]],
    ["skipGitignore", ["ignored"]],
    ["skipIdentity", ["local-identity"]],
  ] as const)("%s の誤答が対応する検査で failed になる", async (key, failingTypes) => {
    const task = fixture("git-record");
    task.mutants = { bad: { ".stella-mutant.json": base64(JSON.stringify({ [key]: true })) } };
    expect(await mutantsFail(task)).toBe(1);
    // 対応する検査を外すと合格するので、別の不備や環境エラーで落ちたのではない。
    task.bundle.manifest.git = {
      checks: checks.filter((check) => !(failingTypes as readonly string[]).includes(check.type)),
    };
    await expect(mutantsFail(task)).rejects.toThrow(/誤答 bad .*落ちません \(passed\)/);
  });

  it("false の指定は準備を省略せず、合格する誤答として検出する", async () => {
    const task = fixture("git-record");
    task.mutants = {
      bad: {
        ".stella-mutant.json": base64(
          JSON.stringify({ skipCommit: false, skipGitignore: false, skipIdentity: false }),
        ),
      },
    };
    await expect(mutantsFail(task)).rejects.toThrow(/誤答 bad .*落ちません \(passed\)/);
  });
});

describe("解答例・誤答のファイル削除", () => {
  it.each(["static-preview", "git-record"] as const)(
    "%s で上書き後に削除し、file-absent を通す",
    async (runner) => {
      const task = fixture(runner);
      task.bundle.files["memo.txt"] = base64("starter");
      // 解答例にも同じパスがある場合、上書きより削除が後になる。
      task.privateFiles["solution/memo.txt"] = base64("solution");
      task.solutionRemoves = ["memo.txt"];
      task.bundle.manifest.static = {
        checks: [
          { type: "file-absent", path: "memo.txt" },
          { type: "file-absent", path: ".stella-solution.json" },
          { type: "file-contains", path: "notes.txt", text: "solution" },
        ],
      };
      await expect(
        solutionPasses(task, task.bundle.files, "配布ファイル"),
      ).resolves.toBeUndefined();
      // 別の配布一式 (固定した開始点) でも同じ順で適用する。
      await expect(
        solutionPasses(
          task,
          { ...task.bundle.files, "memo.txt": base64("fixed") },
          "固定した開始点",
        ),
      ).resolves.toBeUndefined();
      task.solutionRemoves = [];
      await expect(solutionPasses(task, task.bundle.files, "配布ファイル")).rejects.toThrow(
        /検査に通りません/,
      );
    },
  );

  it.each(["static-preview", "git-record"] as const)(
    "%s の誤答を重ねた後にも削除する",
    async (runner) => {
      const task = fixture(runner);
      task.bundle.manifest.static = {
        checks: [{ type: "file-contains", path: "notes.txt", text: "solution" }],
      };
      task.mutants = { removed: { "notes.txt": base64("solution") } };
      task.mutantRemoves = { removed: ["notes.txt"] };
      expect(await mutantsFail(task)).toBe(1);
      task.mutantRemoves = {};
      await expect(mutantsFail(task)).rejects.toThrow(/落ちません \(passed\)/);
    },
  );
});
