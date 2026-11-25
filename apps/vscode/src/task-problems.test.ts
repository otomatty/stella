import { link, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TaskBundle } from "@stella/shared/tasks/catalog";
import type { TaskManifest } from "@stella/shared/tasks/manifest";
import type { RunResult } from "@stella/shared/tasks/run-result";
import { verifyTaskSubmission } from "@stella/shared/tasks/submission";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api.js";
import { hashFile } from "./runner/files.js";
import { loadTask, runTask, saveRunResult } from "./runner/run-task.js";
import * as plans from "./runner/plans.js";
import {
  chooseProblem,
  loadProblemStates,
  loadTaskProblems,
  nextUnsubmittedProblem,
  prepareProblemConsultation,
  prepareProblemSubmission,
  problemCountLabel,
  problemFileToOpen,
  problemForPath,
  problemWorkStatus,
  type ProblemResults,
  type ProblemState,
} from "./task-problems.js";
import { installTask } from "./task-distribution.js";
import { loadTaskProblems as loadEditorTaskProblems } from "./task-update-guard.js";
import type { SubmissionNotes } from "./task-submission.js";

const documents = vi.hoisted(
  () => [] as { isDirty: boolean; uri: { scheme: string; fsPath: string } }[],
);
vi.mock("vscode", () => ({ workspace: { textDocuments: documents } }));

const apiState = vi.hoisted(() => ({ session: 1 as number | undefined }));
vi.mock("./api.js", () => ({ apiRequest: vi.fn(), apiSession: () => apiState.session }));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, link: vi.fn(actual.link) };
});

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
  apiState.session = 1;
  documents.length = 0;
  vi.mocked(link).mockReset();
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

  it("配布済みの問題だけ提出済みなら、問題の指定がないときはファイルを選ばない", () => {
    const done = [state("q01-add", "submitted"), state("q02-sub", "submitted")];
    expect(problemFileToOpen(done, undefined, 3)).toBeUndefined();
    expect(problemFileToOpen(done, "q02-sub", 3)).toBe("src/q02-sub.ts");
    expect(problemFileToOpen(done, undefined, 2)).toBe("src/q01-add.ts");
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

  it("ファイルが変わっていたら提出せず、保存して、もう一度「提出する」を押してください、と言う", async () => {
    const root = await makeRoot();
    const run = await passedRun(root, "q01-add");
    await mkdir(path.join(root, ".stella", "problem-runs"));
    await writeFile(
      path.join(root, ".stella", "problem-runs", "q01-add.json"),
      JSON.stringify(run),
    );
    await writeFile(path.join(root, "src", "q01-add.ts"), "export const add = 2;\n");
    await expect(prepareProblemSubmission(root, "q01-add", [])).rejects.toThrow(
      "保存して、もう一度「提出する」を押してください",
    );
  });

  it("課題の版が変わっていたらもう一度提出するよう案内する", async () => {
    const root = await makeRoot();
    const run = await passedRun(root, "q01-add");
    await mkdir(path.join(root, ".stella", "problem-runs"));
    await writeFile(
      path.join(root, ".stella", "problem-runs", "q01-add.json"),
      JSON.stringify(run),
    );
    await writeFile(
      path.join(root, ".stella", "distribution.json"),
      JSON.stringify({ taskId: manifest.id, contentHash: "cd".repeat(32) }),
    );
    await expect(prepareProblemSubmission(root, "q01-add", [])).rejects.toThrow(
      "確認した課題のバージョンが変わっています。もう一度「提出する」を押してください",
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
        "保存して、もう一度「提出する」を押してください",
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

describe("問題の段階", () => {
  const hash = "ab".repeat(32);
  const staged: TaskManifest = {
    ...manifest,
    problemSteps: true,
    problems: [
      ...(manifest.problems ?? []),
      { id: "q03-mult", title: "掛ける" },
      { id: "q04-div", title: "割る" },
    ],
  };
  const server: ProblemResults = {
    gated: true,
    passedProblems: 1,
    totalProblems: 4,
    taskPassed: false,
    problems: [
      {
        id: "q01-add",
        title: "足す",
        state: "submitted",
        status: "not-submitted",
        firstPassedAt: null,
      },
      { id: "q02-sub", title: "引く", state: "open", status: "passed", firstPassedAt: null },
      {
        id: "q03-mult",
        title: "掛ける",
        state: "locked-previous",
        status: "not-submitted",
        firstPassedAt: null,
      },
      {
        id: "q04-div",
        title: "割る",
        state: "locked-video",
        afterTitle: "割り算",
        status: "not-submitted",
        firstPassedAt: null,
      },
    ],
  };

  it("課題フォルダーにあるソースだけを書き出し済みにする", async () => {
    const root = await makeRoot();
    await rm(path.join(root, "src/q02-sub.ts"));
    const states = await loadProblemStates(root, manifest, undefined);
    expect(states.find((state) => state.id === "q01-add")?.onDisk).toBe(true);
    expect(states.find((state) => state.id === "q02-sub")?.onDisk).toBeUndefined();
  });

  it("サーバーの state で全問を出し、ロックには理由を付ける", async () => {
    const root = await makeRoot();
    vi.mocked(apiRequest).mockResolvedValueOnce(server);
    const problems = await loadTaskProblems(root, staged);
    expect(problems.states.map(({ id, status }) => [id, status])).toEqual([
      ["q01-add", "submitted"],
      ["q02-sub", "not-submitted"],
      ["q03-mult", "not-submitted"],
      ["q04-div", "not-submitted"],
    ]);
    expect(problems.blocked.get("q03-mult")).toBe("前の問題を提出すると、この問題を提出できます");
    expect(problems.blocked.get("q04-div")).toBe("「割り算」を終えると解けます");
    expect(problems.states.find(({ id }) => id === "q02-sub")?.lockReason).toBeUndefined();
    expect(problemFileToOpen(problems.states, "q04-div")).toBe("src/q04-div.ts");
    expect(problems.progress).toEqual({ passed: 1, total: 4 });
  });

  function problemBundle(
    manifest: TaskManifest,
    contentHash = hash,
    secondTest = "test 2",
  ): TaskBundle {
    const sources = {
      ".stella/task.json": JSON.stringify(manifest),
      "README.md": "# 計算",
      "src/q01-add.ts": "export const add = 1;",
      "tests/q01-add.test.ts": "test 1",
      "src/q02-sub.ts": "export const sub = 1;",
      "tests/q02-sub.test.ts": secondTest,
    };
    return {
      manifest,
      contentHash,
      files: Object.fromEntries(
        Object.entries(sources).map(([rel, content]) => [
          rel,
          Buffer.from(content).toString("base64"),
        ]),
      ),
    };
  }

  async function deferSecondProblem(root: string, bundle: TaskBundle) {
    await rm(path.join(root, "src/q02-sub.ts"));
    await rm(path.join(root, "tests/q02-sub.test.ts"));
    const receipt = JSON.parse(
      await readFile(path.join(root, ".stella/distribution.json"), "utf8"),
    ) as { files: Record<string, string> };
    delete receipt.files["src/q02-sub.ts"];
    delete receipt.files["tests/q02-sub.test.ts"];
    await writeFile(
      path.join(root, ".stella/distribution.json"),
      JSON.stringify({
        ...receipt,
        deferred: { "src/q02-sub.ts": null, "tests/q02-sub.test.ts": null },
      }),
    );
    vi.mocked(apiRequest).mockImplementation(async (url: unknown) =>
      String(url).includes("problem-results") ? server : { bundle },
    );
  }

  it("結果の取得中に接続が変わっても、deferred があれば書き出さず確認を止める", async () => {
    const bundle = problemBundle(staged);
    const training = await makeRoot();
    const root = await installTask(training, bundle);
    await deferSecondProblem(root, bundle);
    vi.mocked(apiRequest).mockImplementation(async (url: unknown) => {
      if (String(url).includes("problem-results")) {
        apiState.session = 2;
        return server;
      }
      throw new Error(`should not fetch ${String(url)}`);
    });

    const result = await loadTaskProblems(root, staged, { trainingRoot: training });

    expect(result.releasePending).toBe(true);
    expect(
      vi.mocked(apiRequest).mock.calls.some((call) => /bundle|fixed-start/.test(String(call[0]))),
    ).toBe(false);
    await expect(readFile(path.join(root, "src/q02-sub.ts"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("deferred が無ければ、接続が変わっても手元の確認を止めない", async () => {
    const root = await makeRoot();
    vi.mocked(apiRequest).mockImplementation(async () => {
      apiState.session = 2;
      return server;
    });

    const result = await loadTaskProblems(root, staged);

    expect(result.releasePending).toBeUndefined();
    expect(result.states.map(({ id }) => id)).toEqual([
      "q01-add",
      "q02-sub",
      "q03-mult",
      "q04-div",
    ]);
    expect(result.states.some((state) => state.lockReason)).toBe(false);
  });

  it("問題の状態を読むと、控えてあったファイルを書き出して deferred を外す", async () => {
    const bundle = problemBundle(staged);
    const training = await makeRoot();
    const root = await installTask(training, bundle);
    await deferSecondProblem(root, bundle);

    const result = await loadTaskProblems(root, staged, { trainingRoot: training });

    expect(result.releaseError).toBeUndefined();
    expect(await readFile(path.join(root, "src/q02-sub.ts"), "utf8")).toBe("export const sub = 1;");
    expect(await readFile(path.join(root, "tests/q02-sub.test.ts"), "utf8")).toBe("test 2");
    expect(
      JSON.parse(await readFile(path.join(root, ".stella/distribution.json"), "utf8")).deferred,
    ).toBeUndefined();
  });

  it("控えの書き出しも課題内の未保存文書があれば止め、保存後に続ける", async () => {
    const bundle = problemBundle(staged);
    const training = await makeRoot();
    const root = await installTask(training, bundle);
    await deferSecondProblem(root, bundle);
    const nextTest = path.join(root, "tests/q02-sub.test.ts");
    documents.push({
      isDirty: true,
      uri: { scheme: "file", fsPath: path.join(root, "src/q01-add.ts") },
    });

    const blocked = await loadEditorTaskProblems(root, staged, { trainingRoot: training });
    expect(blocked.releaseError).toContain("ファイルを保存してから");
    await expect(readFile(nextTest)).rejects.toMatchObject({ code: "ENOENT" });

    documents.length = 0;
    expect(
      (await loadEditorTaskProblems(root, staged, { trainingRoot: training })).releaseError,
    ).toBeUndefined();
    expect(await readFile(nextTest, "utf8")).toBe("test 2");
  });

  it("教材の更新で第2問のテストを差し替え、第1問の提出を照合できる", async () => {
    const training = await makeRoot();
    const oldBundle = problemBundle(manifest);
    const root = await installTask(training, oldBundle);
    const updatedManifest: TaskManifest = {
      ...manifest,
      problemSteps: true,
      problems: manifest.problems?.map((problem) => ({
        ...problem,
        after: problem.id === "q02-sub" ? "subtraction" : "addition",
      })),
    };
    const updated = problemBundle(updatedManifest, "cd".repeat(32), "new test 2");
    const q02Source = "src/q02-sub.ts";
    const q02Test = "tests/q02-sub.test.ts";
    await writeFile(path.join(root, q02Source), "export const sub = 2;");

    await installTask(training, updated);

    expect(await readFile(path.join(root, q02Source), "utf8")).toBe("export const sub = 2;");
    expect(await readFile(path.join(root, q02Test), "utf8")).toBe("new test 2");
    const task = await loadTask(root);
    if (!task.ok) throw new Error(task.errors.join("\n"));
    const plan = vi.spyOn(plans, "buildPlan").mockReturnValueOnce([
      { id: "deps", label: "準備", run: async () => ({ status: "skipped", summary: "" }) },
      { id: "test", label: "テスト", run: async () => ({ status: "passed", summary: "" }) },
    ]);
    try {
      const run = await runTask({
        root,
        manifest: task.manifest,
        manifestSha256: task.manifestSha256,
        problem: "q01-add",
        toolchain: { node: null, npm: null },
      });
      expect(run.outcome).toBe("passed");
      expect(run.protected).toContainEqual(await hashFile(root, q02Test));
      await saveRunResult(root, { ...run, taskContentHash: updated.contentHash });
      const input = await prepareProblemSubmission(root, "q01-add", []);
      expect((await verifyTaskSubmission(input, updated)).check).toEqual({
        matched: true,
        reasons: [],
      });
    } finally {
      plan.mockRestore();
    }
  });

  it("オフラインでは控えを読まず、ロックなしで全問を出す", async () => {
    const root = await makeRoot();
    await writeFile(
      path.join(root, ".stella/problem-steps.json"),
      JSON.stringify({ contentHash: hash, server }),
    );
    await writeFile(
      path.join(root, ".stella/submitted-q02-sub.json"),
      JSON.stringify({ contentHash: hash }),
    );
    vi.mocked(apiRequest).mockRejectedValue(new Error("offline"));
    const problems = await loadTaskProblems(root, staged);
    expect(problems.states.map(({ id }) => id)).toEqual([
      "q01-add",
      "q02-sub",
      "q03-mult",
      "q04-div",
    ]);
    expect(problems.blocked.size).toBe(0);
    expect(problems.states.every(({ status }) => status === "not-submitted")).toBe(true);
    expect(problems.progress).toEqual({ passed: 0, total: 4 });
  });

  it("問題の id が違う取得は、進行中の古い一覧を受け取らない", async () => {
    const root = await makeRoot();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.mocked(apiRequest).mockImplementation(async (url: unknown) => {
      if (String(url).includes("problem-results")) {
        await gate;
        return server;
      }
      throw new Error(String(url));
    });
    const first = loadTaskProblems(root, staged);
    const second = loadTaskProblems(root, {
      ...staged,
      problems: staged.problems?.slice(0, 2),
    });
    release();
    try {
      const [older, newer] = await Promise.all([first, second]);
      expect(older.states.map(({ id }) => id)).toEqual([
        "q01-add",
        "q02-sub",
        "q03-mult",
        "q04-div",
      ]);
      expect(newer.states.map(({ id }) => id)).toEqual(["q01-add", "q02-sub"]);
    } finally {
      release();
    }
  });
});
