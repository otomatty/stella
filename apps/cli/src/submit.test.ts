import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { RunResult } from "@stella/shared/tasks/run-result";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../vscode/src/api.js";
import { hashFile } from "../../vscode/src/runner/files.js";
import { runTask } from "../../vscode/src/runner/run-task.js";
import { saveCredentials } from "./credentials.js";
import { main } from "./index.js";

vi.mock("../../vscode/src/api.js", () => {
  class AuthExpiredError extends Error {
    readonly status = 401 as const;
  }
  return { AuthExpiredError, initApi: vi.fn(), apiRequest: vi.fn(), apiSession: () => 0 };
});

vi.mock("../../vscode/src/runner/run-task.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../vscode/src/runner/run-task.js")>();
  return { ...actual, runTask: vi.fn() };
});

const TASK_ID = "extra/unit/calc";
const CONTENT_HASH = "cd".repeat(32);
const SERVER = "https://stella.saedgewell.workers.dev";

const manifest = {
  schemaVersion: 1,
  id: TASK_ID,
  title: "計算",
  kind: "basic",
  runner: "node-test",
  problems: [
    { id: "q01-add", title: "足す" },
    { id: "q02-sub", title: "引く" },
  ],
  submit: { files: ["src/**/*.ts"] },
  protected: [] as string[],
  checks: { lint: false, format: false },
};

function failedRun(problemId: string): RunResult {
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    runner: "node-test",
    outcome: "failed",
    startedAt: "2026-11-06T00:00:00.000Z",
    durationMs: 5,
    platform: "win32",
    toolVersions: {},
    steps: [
      {
        id: "test",
        label: "テスト",
        status: "failed",
        durationMs: 5,
        summary: "1 件が失敗",
        tests: [{ name: "足し算", status: "failed", message: "期待と違う" }],
      },
    ],
    files: [],
    protected: [],
    manifestSha256: "ab".repeat(32),
    problemId,
  };
}

describe("提出", () => {
  const dirs: string[] = [];
  let mode: "pass" | "fail" = "pass";
  const calls: string[] = [];

  beforeEach(() => {
    mode = "pass";
    calls.length = 0;
    vi.mocked(runTask).mockImplementation(async (options) => {
      const id = options.problem ?? "";
      if (mode === "fail") return failedRun(id);
      const hashed = await hashFile(options.root, `src/${id}.ts`);
      const taskJson = await hashFile(options.root, ".stella/task.json");
      return {
        schemaVersion: 1,
        taskId: TASK_ID,
        runner: "node-test",
        outcome: "passed",
        startedAt: "2026-11-06T00:00:00.000Z",
        durationMs: 5,
        platform: "win32",
        toolVersions: {},
        steps: [
          { id: "test", label: "テスト", status: "passed", durationMs: 5, summary: "通りました" },
        ],
        files: [hashed],
        protected: [],
        manifestSha256: taskJson.sha256,
        problemId: id,
      };
    });
    vi.mocked(apiRequest).mockImplementation(
      async (requestPath: string, init?: { body?: unknown }) => {
        calls.push(requestPath);
        if (requestPath.startsWith("/api/tasks/problem-results")) {
          return {
            problems: [
              { id: "q01-add", title: "足す", status: "not-submitted", firstPassedAt: null },
              { id: "q02-sub", title: "引く", status: "not-submitted", firstPassedAt: null },
            ],
            passedProblems: 0,
            totalProblems: 2,
            taskPassed: false,
          };
        }
        if (requestPath === "/api/submissions") {
          const body = init?.body as { problemId?: string };
          return {
            problemId: body.problemId ?? "",
            passedProblems: 1,
            totalProblems: 2,
            taskPassed: false,
          };
        }
        return {};
      },
    );
  });

  afterEach(async () => {
    vi.clearAllMocks();
    for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
  });

  async function taskHome(): Promise<{ root: string; home: string }> {
    const root = await mkdtemp(path.join(tmpdir(), "stella-cli-submit-"));
    dirs.push(root);
    await mkdir(path.join(root, "src"), { recursive: true });
    await mkdir(path.join(root, ".stella"), { recursive: true });
    await writeFile(path.join(root, ".stella", "task.json"), JSON.stringify(manifest));
    await writeFile(
      path.join(root, ".stella", "distribution.json"),
      JSON.stringify({ taskId: TASK_ID, contentHash: CONTENT_HASH }),
    );
    await writeFile(path.join(root, "src", "q01-add.ts"), "export const add = 1;\n");
    await writeFile(path.join(root, "src", "q02-sub.ts"), "export const sub = 1;\n");
    const home = await mkdtemp(path.join(tmpdir(), "stella-cli-home-"));
    dirs.push(home);
    await saveCredentials({ serverUrl: SERVER, accessToken: "submit-token" }, home);
    return { root, home };
  }

  function submissions(): string[] {
    return calls.filter((item) => item === "/api/submissions");
  }

  it("確認が落ちたら提出の API を呼ばない", async () => {
    mode = "fail";
    const { root, home } = await taskHome();
    const out: string[] = [];
    const code = await main(["submit", "q01-add"], {
      cwd: root,
      home,
      env: {},
      stdout: (text) => out.push(text),
    });
    expect(code).toBe(1);
    expect(submissions()).toEqual([]);
    expect(out.join("")).toContain("足し算");
    expect(out.join("")).toContain("期待と違う");
    expect(vi.mocked(runTask)).toHaveBeenCalledTimes(1);
  });

  it("確認が通れば提出の API を呼ぶ", async () => {
    const { root, home } = await taskHome();
    const out: string[] = [];
    const code = await main(["submit", "q01-add"], {
      cwd: root,
      home,
      env: {},
      stdout: (text) => out.push(text),
    });
    expect(code).toBe(0);
    expect(submissions()).toEqual(["/api/submissions"]);
    expect(out.join("")).toContain("q01-add を提出しました (1/2 問)");
  });

  it("--all は最初の失敗で止まる", async () => {
    mode = "fail";
    const { root, home } = await taskHome();
    const code = await main(["submit", "--all"], {
      cwd: root,
      home,
      env: {},
      stdout: () => undefined,
      stderr: () => undefined,
    });
    expect(code).toBe(1);
    expect(vi.mocked(runTask)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(runTask).mock.calls[0]?.[0].problem).toBe("q01-add");
    expect(submissions()).toEqual([]);
  });
});
