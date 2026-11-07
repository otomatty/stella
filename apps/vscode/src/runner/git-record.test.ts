import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { GitCheck, TaskManifest } from "@stella/shared/tasks/manifest";
import { canSubmit } from "@stella/shared/tasks/run-result";
import { afterEach, describe, expect, it } from "vitest";
import { buildPlan } from "./plans.js";
import { loadTask, runTask } from "./run-task.js";

const exec = promisify(execFile);
const roots: string[] = [];
const checks: GitCheck[] = [
  { type: "learning-folder-root" },
  { type: "local-identity" },
  { type: "committed", paths: ["./日本語 notes.txt", "-notes.txt"] },
  { type: "commit-count", min: 2 },
  { type: "ignored", path: "node_modules/probe" },
  { type: "ignored", path: ".stella/last-run.json" },
];
function manifest(gitChecks = checks): TaskManifest {
  return {
    schemaVersion: 1,
    id: "dev-env-basics/u03/q01",
    title: "記録",
    kind: "basic",
    runner: "git-record",
    submit: { files: ["*.txt"] },
    protected: [],
    checks: { lint: false, format: false },
    git: { checks: gitChecks },
  };
}
async function setup(initAtTask = false) {
  const learning = await mkdtemp(path.join(tmpdir(), "stella-git-record-"));
  roots.push(learning);
  const root = path.join(learning, "ステージ", "単元", "課題");
  await mkdir(root, { recursive: true });
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: path.join(learning, "no-global"),
    GIT_AUTHOR_NAME: "学習者",
    GIT_AUTHOR_EMAIL: "student@example.com",
    GIT_COMMITTER_NAME: "学習者",
    GIT_COMMITTER_EMAIL: "student@example.com",
  };
  const git = (...args: string[]) => exec("git", args, { cwd: root, env });
  const init = () => exec("git", ["init", "-q"], { cwd: initAtTask ? root : learning, env });
  const run = (task = manifest(), runEnv = env) =>
    runTask({ root, manifest: task, manifestSha256: "a".repeat(64), env: runEnv });
  const record = async () => {
    await git("add", "--", ".");
    await git(
      "-c",
      `core.hooksPath=${path.join(learning, "no-hooks")}`,
      "-c",
      "commit.gpgSign=false",
      "commit",
      "-q",
      "-m",
      "学習の記録",
    );
  };
  await writeFile(path.join(root, "日本語 notes.txt"), "今日の学習\n");
  await writeFile(path.join(root, "-notes.txt"), "記録\n");
  await writeFile(path.join(root, ".gitignore"), "node_modules/\n.stella/last-run.json\n");
  return { learning, root, env, git, init, run, record };
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("git-record", () => {
  it("学習フォルダーの local 設定・コミット数・変更・無視を本物の Git で検査する", async () => {
    const task = await setup();
    const absent = await task.run();
    expect(absent.steps.find((s) => s.id === "git")?.tests?.[0]?.message).toContain("git init");
    await task.init();
    const empty = await task.run();
    const tests = empty.steps.find((s) => s.id === "git")?.tests;
    expect(tests?.map((t) => t.status)).toEqual([
      "passed",
      "failed",
      "failed",
      "failed",
      "passed",
      "passed",
    ]);
    expect(tests?.[3]?.message).toContain("まだコミットがありません");
    // 環境変数の identity では local-identity を満たさない。
    await task.git("config", "--local", "user.name", "学習者");
    await task.git("config", "--local", "user.email", "student@example.com");
    await task.record();
    const once = await task.run();
    expect(once.steps.find((s) => s.id === "git")?.tests?.map((t) => t.status)).toEqual([
      "passed",
      "passed",
      "passed",
      "failed",
      "passed",
      "passed",
    ]);
    await writeFile(path.join(task.root, "日本語 notes.txt"), "今日の学習\n変更\n");
    expect((await task.run()).steps.find((s) => s.id === "git")?.tests?.[2]?.status).toBe("failed");
    await task.git("add", "--", "日本語 notes.txt");
    expect((await task.run()).steps.find((s) => s.id === "git")?.tests?.[2]?.status).toBe("failed");
    await task.record();
    expect(canSubmit(await task.run())).toBe(true);
    // 課題の外のコミットは回数に足さない。
    await writeFile(path.join(task.learning, "outside.txt"), "外\n");
    await exec("git", ["add", "--", "outside.txt"], { cwd: task.learning, env: task.env });
    await task.record();
    expect((await task.run(manifest([{ type: "commit-count", min: 3 }]))).outcome).toBe("failed");
    await writeFile(path.join(task.root, ".gitignore"), "");
    expect((await task.run()).steps.find((s) => s.id === "git")?.tests?.[4]?.status).toBe("failed");
  });
  it("課題フォルダー自身で init した場合は場所を直すよう案内する", async () => {
    const task = await setup(true);
    await task.init();
    const result = await task.run(manifest([{ type: "learning-folder-root" }]));
    expect(result.steps[0]?.tests?.[0]?.message).toContain("3 つ上");
  });
  it("Git が無ければインストールを案内する", async () => {
    const task = await setup();
    const result = await task.run(manifest(), { ...task.env, PATH: "", Path: "" });
    expect(result.steps[0]).toMatchObject({
      id: "git",
      status: "error",
      summary: expect.stringContaining("Git が見つかりません"),
    });
  });
  it("static は指定があるときだけ先に検査する", () => {
    const task = manifest();
    expect(buildPlan(task).map((s) => s.id)).toEqual(["git"]);
    task.static = { checks: [{ type: "file-absent", path: "old.txt" }] };
    expect(buildPlan(task).map((s) => s.id)).toEqual(["static", "git"]);
  });
  it("見本を学習フォルダーに置いてコミットすると提出できる", async () => {
    const task = await setup();
    await cp(new URL("../../samples/git-record/", import.meta.url), task.root, { recursive: true });
    await task.init();
    await task.git("config", "--local", "user.name", "学習者");
    await task.git("config", "--local", "user.email", "student@example.com");
    await task.record();
    const loaded = await loadTask(task.root);
    if (!loaded.ok) throw new Error(loaded.errors.join("\n"));
    const result = await task.run(loaded.manifest);
    expect(result.steps.map((s) => [s.id, s.status])).toEqual([
      ["static", "passed"],
      ["git", "passed"],
      ["files", "passed"],
    ]);
    expect(canSubmit(result)).toBe(true);
  });
});
