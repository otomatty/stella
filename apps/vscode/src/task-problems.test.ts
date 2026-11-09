import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TaskManifest } from "@stella/shared/tasks/manifest";
import type { RunResult } from "@stella/shared/tasks/run-result";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hashFile } from "./runner/files.js";
import {
  chooseProblem,
  loadProblemStates,
  nextUnsubmittedProblem,
  prepareProblemConsultation,
  prepareProblemSubmission,
  problemCountLabel,
  problemFileToOpen,
  problemForPath,
  problemWorkStatus,
  type ProblemState,
} from "./task-problems.js";
import type { SubmissionNotes } from "./task-submission.js";

vi.mock("./api.js", () => ({ apiRequest: vi.fn(), apiSession: () => 1 }));

const manifest: TaskManifest = {
  schemaVersion: 1,
  id: "extra/unit/calc",
  title: "計算",
  kind: "basic",
  runner: "node-test",
  problems: [
    { id: "q01-add", title: "足す" },
    { id: "q02-sub", title: "引く" },
  ],
  submit: { files: ["src/**/*.ts"] },
  protected: ["tests/**"],
  checks: { lint: false, format: false },
};

const dotnet: TaskManifest = {
  ...manifest,
  runner: "dotnet-test",
  problems: [{ id: "q01-add", title: "足す" }],
  submit: { files: ["src/**/*.cs"] },
  protected: ["tests/**"],
};

function state(id: string, status: ProblemState["status"], source = `src/${id}.ts`): ProblemState {
  const title = manifest.problems?.find((problem) => problem.id === id)?.title ?? id;
  return { id, title, source, status };
}

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "stella-problems-"));
  roots.push(root);
  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, "tests"), { recursive: true });
  await mkdir(path.join(root, ".stella"), { recursive: true });
  await writeFile(path.join(root, ".stella", "task.json"), JSON.stringify(manifest));
  await writeFile(
    path.join(root, ".stella", "distribution.json"),
    JSON.stringify({ taskId: manifest.id, contentHash: "ab".repeat(32) }),
  );
  await writeFile(path.join(root, "src", "q01-add.ts"), "export const add = 1;\n");
  await writeFile(path.join(root, "src", "q02-sub.ts"), "export const sub = 1;\n");
  await writeFile(path.join(root, "tests", "q01-add.test.ts"), "test");
  return root;
}

async function passedRun(root: string, id: string): Promise<RunResult> {
  const hashed = await hashFile(root, `src/${id}.ts`);
  const protectedFile = await hashFile(root, "tests/q01-add.test.ts");
  const taskJson = await hashFile(root, ".stella/task.json");
  return {
    schemaVersion: 1,
    taskId: manifest.id,
    runner: "node-test",
    outcome: "passed",
    startedAt: "2026-11-06T00:00:00.000Z",
    durationMs: 10,
    platform: "win32",
    toolVersions: {},
    steps: [
      { id: "test", label: "テスト", status: "passed", durationMs: 10, summary: "通りました" },
    ],
    files: [hashed],
    protected: [protectedFile],
    manifestSha256: taskJson.sha256,
    taskContentHash: "ab".repeat(32),
    problemId: id,
  };
}

async function passedRunWithImport(root: string): Promise<RunResult> {
  await writeFile(
    path.join(root, "src", "q01-add.ts"),
    'import { sub } from "./q02-sub";\nexport const add = sub;\n',
  );
  return {
    ...(await passedRun(root, "q01-add")),
    importedFiles: [await hashFile(root, "src/q02-sub.ts")],
  };
}

describe("問題の状態", () => {
  it("サーバーの提出済みが先で、無ければ手元の合格、どちらも無ければ未提出", () => {
    expect(problemWorkStatus(true, "failed")).toBe("submitted");
    expect(problemWorkStatus(true, undefined)).toBe("submitted");
    expect(problemWorkStatus(false, "passed")).toBe("local-passed");
    expect(problemWorkStatus(false, "failed")).toBe("not-submitted");
    expect(problemWorkStatus(false, undefined)).toBe("not-submitted");
  });

  it("手元の合格とサーバーの提出済みを一覧にする", async () => {
    const root = await makeRoot();
    await mkdir(path.join(root, ".stella", "problem-runs"));
    await writeFile(
      path.join(root, ".stella", "problem-runs", "q02-sub.json"),
      JSON.stringify(await passedRun(root, "q02-sub")),
    );
    const states = await loadProblemStates(root, manifest, {
      problems: [
        {
          id: "q01-add",
          title: "足す",
          status: "passed",
          firstPassedAt: "2026-11-01T00:00:00.000Z",
        },
        { id: "q02-sub", title: "引く", status: "not-submitted", firstPassedAt: null },
      ],
      passedProblems: 1,
      totalProblems: 2,
      taskPassed: false,
    });
    expect(states.map((item) => [item.id, item.status, item.source])).toEqual([
      ["q01-add", "submitted", "src/q01-add.ts"],
      ["q02-sub", "local-passed", "src/q02-sub.ts"],
    ]);
  });

  it("次の未提出は提出済みを飛ばし、全部提出済みなら無い", () => {
    const mixed = [state("q01-add", "submitted"), state("q02-sub", "local-passed")];
    expect(nextUnsubmittedProblem(mixed)?.id).toBe("q02-sub");
    expect(problemFileToOpen(mixed)).toBe("src/q02-sub.ts");
    const done = [state("q01-add", "submitted"), state("q02-sub", "submitted")];
    expect(nextUnsubmittedProblem(done)).toBeUndefined();
    expect(problemFileToOpen(done)).toBe("src/q01-add.ts");
    expect(problemCountLabel(12, 20)).toBe("12/20 問");
  });
});

describe("ファイルから問題を決める", () => {
  it("src/<id>.ts だけを返し、テストや別のパスは返さない", () => {
    expect(problemForPath(manifest, "src/q01-add.ts")?.id).toBe("q01-add");
    expect(problemForPath(manifest, "src/q02-sub.ts")?.id).toBe("q02-sub");
    for (const rel of [
      "tests/q01-add.test.ts",
      "src/q01-add.test.ts",
      "src/q01-add.tsx",
      "src/q01-add.ts.bak",
      "src/extra/q01-add.ts",
      "src/q01-add.ts/extra",
      "q01-add.ts",
      "src/q99-missing.ts",
      "./src/q01-add.ts",
    ]) {
      expect(problemForPath(manifest, rel), rel).toBeUndefined();
    }
    expect(problemForPath(dotnet, "src/q01-add.cs")?.id).toBe("q01-add");
    expect(problemForPath(dotnet, "src/q01-add.ts")).toBeUndefined();
  });

  it("開いている問題のファイルを優先し、違えば次の未提出、全部済みなら 1 問目", () => {
    const states = [state("q01-add", "not-submitted"), state("q02-sub", "local-passed")];
    expect(chooseProblem(states, "src/q02-sub.ts", manifest)?.id).toBe("q02-sub");
    expect(chooseProblem(states, "README.md", manifest)?.id).toBe("q01-add");
    expect(chooseProblem(states, "tests/q01-add.test.ts", manifest)?.id).toBe("q01-add");
    expect(chooseProblem(states, undefined, manifest)?.id).toBe("q01-add");
    const done = [state("q01-add", "submitted"), state("q02-sub", "submitted")];
    expect(chooseProblem(done, "src/q02-sub.ts", manifest)?.id).toBe("q02-sub");
    expect(chooseProblem(done, "README.md", manifest)?.id).toBe("q01-add");
  });
});

describe("問題の提出", () => {
  it("合格した 1 ファイルと実行結果を本文にする", async () => {
    const root = await makeRoot();
    const run = await passedRun(root, "q01-add");
    await mkdir(path.join(root, ".stella", "problem-runs"));
    await writeFile(
      path.join(root, ".stella", "problem-runs", "q01-add.json"),
      JSON.stringify(run),
    );
    const body = await prepareProblemSubmission(root, "q01-add", []);
    expect(body.problemId).toBe("q01-add");
    expect(body.mode).toBe("submit");
    expect(body.explanation).toBe("");
    expect(body.files.map((file) => file.path)).toEqual(["src/q01-add.ts"]);
    expect(body.localResult.problemId).toBe("q01-add");
    expect(Buffer.from(body.files[0]?.content ?? "", "base64").toString()).toBe(
      "export const add = 1;\n",
    );
  });

  it("ファイルが変わっていたら提出せず、確認し直してください、と言う", async () => {
    const root = await makeRoot();
    const run = await passedRun(root, "q01-add");
    await mkdir(path.join(root, ".stella", "problem-runs"));
    await writeFile(
      path.join(root, ".stella", "problem-runs", "q01-add.json"),
      JSON.stringify(run),
    );
    await writeFile(path.join(root, "src", "q01-add.ts"), "export const add = 2;\n");
    await expect(prepareProblemSubmission(root, "q01-add", [])).rejects.toThrow(
      "確認し直してください",
    );
  });

  it("import したファイルが変わっていなければ 1 ファイルだけ提出する", async () => {
    const root = await makeRoot();
    const run = await passedRunWithImport(root);
    await mkdir(path.join(root, ".stella", "problem-runs"));
    await writeFile(
      path.join(root, ".stella", "problem-runs", "q01-add.json"),
      JSON.stringify(run),
    );

    const body = await prepareProblemSubmission(root, "q01-add", []);
    expect(body.files.map((file) => file.path)).toEqual(["src/q01-add.ts"]);
    expect(body.localResult.importedFiles).toEqual(run.importedFiles);
  });

  it.each(["変更", "削除"] as const)(
    "import したファイルを%sしたら確認し直しにする",
    async (change) => {
      const root = await makeRoot();
      const run = await passedRunWithImport(root);
      await mkdir(path.join(root, ".stella", "problem-runs"));
      await writeFile(
        path.join(root, ".stella", "problem-runs", "q01-add.json"),
        JSON.stringify(run),
      );
      const importedPath = path.join(root, "src", "q02-sub.ts");
      if (change === "変更") await writeFile(importedPath, "export const sub = 2;\n");
      else await rm(importedPath);

      await expect(prepareProblemSubmission(root, "q01-add", [])).rejects.toThrow(
        "確認し直してください",
      );
    },
  );

  it("import の記録が無い古い実行結果でも提出できる", async () => {
    const root = await makeRoot();
    const run = await passedRunWithImport(root);
    delete run.importedFiles;
    await mkdir(path.join(root, ".stella", "problem-runs"));
    await writeFile(
      path.join(root, ".stella", "problem-runs", "q01-add.json"),
      JSON.stringify(run),
    );
    await writeFile(path.join(root, "src", "q02-sub.ts"), "export const sub = 2;\n");

    const body = await prepareProblemSubmission(root, "q01-add", []);
    expect(body.mode).toBe("submit");
    expect(body.files.map((file) => file.path)).toEqual(["src/q01-add.ts"]);
    expect(body.localResult).not.toHaveProperty("importedFiles");
  });

  it("手元が合格していなければ提出しない", async () => {
    const root = await makeRoot();
    const run = await passedRun(root, "q01-add");
    run.outcome = "failed";
    await mkdir(path.join(root, ".stella", "problem-runs"));
    await writeFile(
      path.join(root, ".stella", "problem-runs", "q01-add.json"),
      JSON.stringify(run),
    );
    await expect(prepareProblemSubmission(root, "q01-add", [])).rejects.toThrow("すべて通って");
  });
});

describe("問題の相談", () => {
  const notes: SubmissionNotes = {
    explanation: "足す処理を書き直しましたが、負数のテストが通りません。",
    debuggingRecord: {
      reproduction: "負数を渡す",
      expected: "合計が返る",
      cause: "まだ分かりません",
      fix: "戻り値を見直しました",
      regression: "負数のテストを確認しました",
    },
    support: [{ kind: "instructor", at: "2026-11-09T00:00:00.000Z" }],
  };

  it("確認後に変えたファイルと今の保護ファイルのハッシュを、失敗した問題の結果と送る", async () => {
    const root = await makeRoot();
    const run = await passedRun(root, "q01-add");
    run.outcome = "failed";
    await mkdir(path.join(root, ".stella", "problem-runs"));
    await writeFile(
      path.join(root, ".stella", "problem-runs", "q01-add.json"),
      JSON.stringify(run),
    );
    const changedSource = "export const add = 2;\n";
    await writeFile(path.join(root, "src", "q01-add.ts"), changedSource);
    await writeFile(path.join(root, "tests", "q01-add.test.ts"), "changed test");

    const body = await prepareProblemConsultation(root, "q01-add", notes);
    expect(body).toMatchObject({
      taskId: manifest.id,
      contentHash: run.taskContentHash,
      mode: "consult",
      problemId: "q01-add",
      localResult: run,
      ...notes,
    });
    expect(body.files).toEqual([
      { path: "src/q01-add.ts", content: Buffer.from(changedSource).toString("base64") },
    ]);
    expect(body.protected).toEqual([await hashFile(root, "tests/q01-add.test.ts")]);
    expect(body.protected).not.toEqual(run.protected);
  });

  it("import したファイルを確認後に変えていても相談できる", async () => {
    const root = await makeRoot();
    const run = await passedRunWithImport(root);
    run.outcome = "failed";
    await mkdir(path.join(root, ".stella", "problem-runs"));
    await writeFile(
      path.join(root, ".stella", "problem-runs", "q01-add.json"),
      JSON.stringify(run),
    );
    await writeFile(path.join(root, "src", "q02-sub.ts"), "export const sub = 2;\n");

    const body = await prepareProblemConsultation(root, "q01-add", notes);
    expect(body.mode).toBe("consult");
    expect(body.files.map((file) => file.path)).toEqual(["src/q01-add.ts"]);
    expect(body.localResult).toEqual(run);
  });

  it("手元の確認が通っていたら提出を案内する", async () => {
    const root = await makeRoot();
    await mkdir(path.join(root, ".stella", "problem-runs"));
    await writeFile(
      path.join(root, ".stella", "problem-runs", "q01-add.json"),
      JSON.stringify(await passedRun(root, "q01-add")),
    );
    await expect(prepareProblemConsultation(root, "q01-add", notes)).rejects.toThrow(
      "手元の確認が通っています。「提出」を使ってください",
    );
  });

  it("その問題の実行結果がなければ確認を案内する", async () => {
    const root = await makeRoot();
    await expect(prepareProblemConsultation(root, "q01-add", notes)).rejects.toThrow(
      "この問題の実行結果がありません。先に確認してください",
    );
  });
});

describe("依存", () => {
  it("vscode を import しない", async () => {
    const source = await readFile(new URL("./task-problems.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/from\s+["']vscode["']/);
    expect(source).not.toMatch(/require\(\s*["']vscode["']\s*\)/);
  });
});
