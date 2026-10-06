import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TaskBundle } from "@stella/shared/tasks/catalog";
import { installTask, TaskInstallConflict } from "./task-distribution.js";
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, writeFile: vi.fn(actual.writeFile), rename: vi.fn(actual.rename) };
});
const dirs: string[] = [];
afterEach(async () => {
  vi.mocked(writeFile).mockReset();
  vi.mocked(rename).mockReset();
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});
const bundle: TaskBundle = {
  manifest: {
    schemaVersion: 1,
    id: "course/unit/q1",
    title: "課題",
    kind: "basic",
    runner: "node-test",
    submit: { files: ["index.js"] },
    protected: [],
    checks: { lint: false, format: false },
  },
  contentHash: "a".repeat(64),
  files: {
    "index.js": Buffer.from("starter").toString("base64"),
    "README.md": Buffer.from("課題文").toString("base64"),
    ".stella/task.json": Buffer.from("{}").toString("base64"),
  },
};
async function root() {
  const dir = await mkdtemp(path.join(tmpdir(), "stella-distribution-"));
  dirs.push(dir);
  return dir;
}
async function conflictOf(promise: Promise<unknown>): Promise<TaskInstallConflict> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(TaskInstallConflict);
  return error as TaskInstallConflict;
}
describe("課題の配布", () => {
  it("同じ課題を開き直しても編集したファイルを上書きしない", async () => {
    const training = await root();
    const taskRoot = await installTask(training, bundle);
    expect(taskRoot).toBe(path.join(training, "course/unit/q1"));
    await writeFile(path.join(taskRoot, "index.js"), "learner code");
    expect(await installTask(training, bundle)).toBe(taskRoot);
    expect(await readFile(path.join(taskRoot, "index.js"), "utf8")).toBe("learner code");
  });
  it("教材が更新されたら、上書きせずに変わるファイルを示す", async () => {
    const training = await root();
    const taskRoot = await installTask(training, bundle);
    await writeFile(path.join(taskRoot, "index.js"), "learner code");
    const updated = {
      ...bundle,
      contentHash: "b".repeat(64),
      files: { ...bundle.files, "index.js": Buffer.from("new starter").toString("base64") },
    };
    const conflict = await conflictOf(installTask(training, updated));
    expect(conflict.reason).toBe("updated");
    expect(conflict.target).toBe(taskRoot);
    expect(conflict.files).toEqual(["index.js"]);
    expect(conflict.message).toContain("教材が更新");
    expect(await readFile(path.join(taskRoot, "index.js"), "utf8")).toBe("learner code");
  });
  it("配布先が既存のリンクなら書き込まない", async () => {
    const training = await root();
    const elsewhere = await root();
    await symlink(elsewhere, path.join(training, "course"));
    await expect(installTask(training, bundle)).rejects.toThrow("通常のフォルダー");
    expect(await readdir(elsewhere)).toEqual([]);
  });
  it("学習フォルダー自体はリンクでもよく、返すパスは学習フォルダーの表記にそろえる", async () => {
    const real = await root();
    const holder = await root();
    const training = path.join(holder, "web-training");
    await symlink(real, training);
    const taskRoot = await installTask(training, bundle);
    expect(taskRoot).toBe(path.join(training, "course/unit/q1"));
    expect(await readFile(path.join(real, "course/unit/q1/README.md"), "utf8")).toBe("課題文");
  });
  it("配布記録が無い課題フォルダーでは、同じ名前のファイルを上書きせず衝突を示す", async () => {
    const training = await root();
    const installed = await installTask(training, bundle);
    await writeFile(path.join(installed, "index.js"), "learner code");
    await rm(path.join(installed, ".stella/distribution.json"));
    const conflict = await conflictOf(installTask(training, bundle));
    expect(conflict.reason).toBe("occupied");
    expect(conflict.target).toBe(installed);
    expect(conflict.files.sort()).toEqual([".stella/task.json", "README.md", "index.js"]);
    expect(conflict.message).toContain("衝突");
    expect(await readFile(path.join(installed, "index.js"), "utf8")).toBe("learner code");
  });
  it("途中がファイルで塞がれていても、そのパスを衝突として示す", async () => {
    const training = await root();
    const target = path.join(training, "course/unit/q1");
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, ".stella"), "not a folder");
    const conflict = await conflictOf(installTask(training, bundle));
    expect(conflict.files).toEqual([".stella"]);
  });
  it("配布記録の親がリンクなら記録を読まずに止める", async () => {
    const training = await root();
    const elsewhere = await root();
    const installed = await installTask(training, bundle);
    await rm(path.join(installed, ".stella"), { recursive: true });
    await writeFile(
      path.join(elsewhere, "distribution.json"),
      JSON.stringify({ taskId: bundle.manifest.id, contentHash: bundle.contentHash }),
    );
    await symlink(elsewhere, path.join(installed, ".stella"));
    await expect(installTask(training, bundle)).rejects.toThrow("通常のフォルダー");
  });
  it.each(["README.md", ".stella/task.json"])(
    "%s が欠けていたら不足として示し、学習者の編集を保持する",
    async (file) => {
      const training = await root();
      const installed = await installTask(training, bundle);
      await writeFile(path.join(installed, "index.js"), "learner code");
      await rm(path.join(installed, file));
      const conflict = await conflictOf(installTask(training, bundle));
      expect(conflict.reason).toBe("damaged");
      expect(conflict.files).toEqual([file]);
      expect(await readFile(path.join(installed, "index.js"), "utf8")).toBe("learner code");
    },
  );
  it("配布中の書き込み失敗は未完成の課題を残さず、再試行できる", async () => {
    const training = await root();
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(writeFile)
      .mockImplementationOnce(actual.writeFile)
      .mockRejectedValueOnce(new Error("disk full"));
    await expect(installTask(training, bundle)).rejects.toThrow("disk full");
    expect(await readdir(path.join(training, "course/unit"))).toEqual([]);
    const installed = await installTask(training, bundle);
    expect(await readFile(path.join(installed, "README.md"), "utf8")).toBe("課題文");
  });
  it("公開直前の失敗でも未完成の課題を残さず、再試行できる", async () => {
    const training = await root();
    vi.mocked(rename).mockRejectedValueOnce(new Error("publish failed"));
    await expect(installTask(training, bundle)).rejects.toThrow("publish failed");
    expect(await readdir(path.join(training, "course/unit"))).toEqual([]);
    const installed = await installTask(training, bundle);
    expect(await readFile(path.join(installed, "index.js"), "utf8")).toBe("starter");
  });
  it("空のフォルダーにも、同じ名前の無い学習者のファイルの横にも配り、そのファイルは残す", async () => {
    const training = await root();
    const target = path.join(training, "course/unit/q1");
    await mkdir(target, { recursive: true });
    expect(await installTask(training, bundle)).toBe(target);
    await rm(target, { recursive: true });
    await mkdir(target);
    await writeFile(path.join(target, "notes.txt"), "learner notes");
    expect(await installTask(training, bundle)).toBe(target);
    expect(await readFile(path.join(target, "notes.txt"), "utf8")).toBe("learner notes");
    expect(await readFile(path.join(target, "index.js"), "utf8")).toBe("starter");
    expect(
      JSON.parse(await readFile(path.join(target, ".stella/distribution.json"), "utf8")),
    ).toEqual({ taskId: bundle.manifest.id, contentHash: bundle.contentHash });
  });
  it("学習者のファイルの横に配る途中で失敗したら、自分が作ったものだけを片付ける", async () => {
    const training = await root();
    const target = path.join(training, "course/unit/q1");
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, "notes.txt"), "learner notes");
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(writeFile)
      .mockImplementationOnce(actual.writeFile)
      .mockImplementationOnce(actual.writeFile)
      .mockRejectedValueOnce(new Error("disk full"));
    await expect(installTask(training, bundle)).rejects.toThrow("disk full");
    expect(await readdir(target)).toEqual(["notes.txt"]);
  });
  it("再オープン時に配布ファイルが外へのリンクなら不足として示す", async () => {
    const training = await root();
    const elsewhere = await root();
    const installed = await installTask(training, bundle);
    await writeFile(path.join(elsewhere, "README.md"), "outside");
    await rm(path.join(installed, "README.md"));
    await symlink(path.join(elsewhere, "README.md"), path.join(installed, "README.md"));
    const conflict = await conflictOf(installTask(training, bundle));
    expect(conflict.reason).toBe("damaged");
    expect(conflict.files).toEqual(["README.md"]);
  });
  it.each([".stella/support.json", ".stella/distribution.json", "private/solution.js", "./x.js"])(
    "配布物に %s があれば配らない",
    async (rel) => {
      const training = await root();
      const files = { ...bundle.files, [rel]: Buffer.from("x").toString("base64") };
      await expect(installTask(training, { ...bundle, files })).rejects.toThrow();
      expect(await readdir(training)).toEqual([]);
    },
  );
});

describe("固定した開始点", () => {
  const fixedStart: TaskBundle = {
    ...bundle,
    files: { ...bundle.files, "index.js": Buffer.from("works so far").toString("base64") },
  };
  const now = new Date("2026-10-06T00:00:00.000Z");
  it("元の課題フォルダーに触れず、隣のフォルダーに置いて使ったことを記録する", async () => {
    const training = await root();
    const original = await installTask(training, bundle);
    await writeFile(path.join(original, "index.js"), "broken learner code");
    const fixed = await installTask(training, fixedStart, { variant: "fixed-start", now });
    expect(fixed).toBe(path.join(training, "course/unit/q1-fixed-start"));
    expect(await readFile(path.join(original, "index.js"), "utf8")).toBe("broken learner code");
    expect(await readFile(path.join(fixed, "index.js"), "utf8")).toBe("works so far");
    expect(JSON.parse(await readFile(path.join(fixed, ".stella/support.json"), "utf8"))).toEqual([
      { kind: "fixed-start", at: now.toISOString(), detail: "固定した開始点から始めた" },
    ]);
    expect(
      JSON.parse(await readFile(path.join(fixed, ".stella/distribution.json"), "utf8")),
    ).toEqual({
      taskId: bundle.manifest.id,
      contentHash: bundle.contentHash,
      variant: "fixed-start",
    });
    // 開き直しても記録や作業を書き換えない。
    await writeFile(path.join(fixed, "index.js"), "learner continues");
    expect(await installTask(training, fixedStart, { variant: "fixed-start" })).toBe(fixed);
    expect(await readFile(path.join(fixed, "index.js"), "utf8")).toBe("learner continues");
  });
  it("通常の配布記録があるフォルダーを固定した開始点として扱わない", async () => {
    const training = await root();
    const fixed = path.join(training, "course/unit/q1-fixed-start");
    await mkdir(path.join(fixed, ".stella"), { recursive: true });
    await writeFile(
      path.join(fixed, ".stella/distribution.json"),
      JSON.stringify({ taskId: bundle.manifest.id, contentHash: bundle.contentHash }),
    );
    const conflict = await conflictOf(
      installTask(training, fixedStart, { variant: "fixed-start" }),
    );
    expect(conflict.reason).toBe("occupied");
    expect(conflict.files).toEqual([".stella/distribution.json"]);
  });
});
