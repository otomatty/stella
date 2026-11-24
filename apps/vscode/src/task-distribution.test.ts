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
import { normalizeForHash } from "@stella/shared/tasks/hash";
import type { TaskBundle } from "@stella/shared/tasks/catalog";
import {
  installTask,
  protectedTaskFiles,
  TaskInstallConflict,
  unlockTaskFiles,
} from "./task-distribution.js";
import { sha256Hex } from "./runner/files.js";

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
const receiptPath = ".stella/distribution.json";
const readReceipt = async (taskRoot: string) =>
  JSON.parse(await readFile(path.join(taskRoot, receiptPath), "utf8"));
const makeHashes = (files: TaskBundle["files"]) =>
  Object.fromEntries(
    Object.entries(files).map(([rel, encoded]) => [
      rel,
      sha256Hex(normalizeForHash(Buffer.from(encoded, "base64"))),
    ]),
  );
const nextBundle = (changes: Record<string, string>): TaskBundle => ({
  ...bundle,
  contentHash: "b".repeat(64),
  files: {
    ...bundle.files,
    ...Object.fromEntries(
      Object.entries(changes).map(([rel, data]) => [rel, Buffer.from(data).toString("base64")]),
    ),
  },
});
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
    const updated = nextBundle({
      "README.md": "new readme",
      ".stella/task.json": '{"checks":{}}',
      "index.js": "new starter",
      "new.txt": "new file",
    });
    const conflict = await conflictOf(installTask(training, updated));
    expect(conflict.reason).toBe("updated");
    expect(conflict.target).toBe(taskRoot);
    expect(conflict.files).toEqual(["index.js"]);
    expect(conflict.message).toContain("教材が更新");
    expect(await readFile(path.join(taskRoot, "index.js"), "utf8")).toBe("learner code");
    expect(await readFile(path.join(taskRoot, "README.md"), "utf8")).toBe("課題文");
    expect(await readFile(path.join(taskRoot, ".stella/task.json"), "utf8")).toBe("{}");
    expect(await readReceipt(taskRoot)).toMatchObject({ contentHash: bundle.contentHash });
    await expect(readFile(path.join(taskRoot, "new.txt"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect((await readdir(path.join(taskRoot, ".stella"))).sort()).toEqual([
      "distribution.json",
      "task.json",
    ]);
  });
  it("雛形が同じなら編集したコードと配布から外れたファイルを残す", async () => {
    const training = await root();
    const old = {
      ...bundle,
      files: { ...bundle.files, "retired.txt": Buffer.from("old").toString("base64") },
    };
    const taskRoot = await installTask(training, old);
    await writeFile(path.join(taskRoot, "index.js"), "learner code");
    const updated = nextBundle({ "README.md": "new readme" });
    const onUpdated = vi.fn();
    expect(await installTask(training, updated, { onUpdated })).toBe(taskRoot);
    expect(onUpdated).toHaveBeenCalledWith(undefined);
    expect(await readFile(path.join(taskRoot, "index.js"), "utf8")).toBe("learner code");
    expect(await readFile(path.join(taskRoot, "README.md"), "utf8")).toBe("new readme");
    expect(await readFile(path.join(taskRoot, "retired.txt"), "utf8")).toBe("old");
    expect(await readReceipt(taskRoot)).toEqual({
      taskId: bundle.manifest.id,
      contentHash: updated.contentHash,
      files: makeHashes(updated.files),
    });
  });
  it.each([false, true])(
    "雛形が変わったとき未編集または無いファイルを更新する (削除済み %s)",
    async (removed) => {
      const training = await root();
      const taskRoot = await installTask(training, bundle);
      if (removed) await rm(path.join(taskRoot, "index.js"));
      else await writeFile(path.join(taskRoot, "index.js"), "\ufeffstarter");
      await installTask(training, nextBundle({ "index.js": "new starter" }));
      expect(await readFile(path.join(taskRoot, "index.js"), "utf8")).toBe("new starter");
    },
  );
  it("編集した保護ファイルと課題文を退避して更新する", async () => {
    const training = await root();
    const tests = "tests/index.test.js";
    const old = {
      ...bundle,
      manifest: {
        ...bundle.manifest,
        submit: { files: ["**/*"] },
        protected: [tests, "README.md"],
      },
      files: { ...bundle.files, [tests]: Buffer.from("test").toString("base64") },
    };
    const taskRoot = await installTask(training, old);
    await writeFile(path.join(taskRoot, "README.md"), "learner notes");
    await writeFile(path.join(taskRoot, tests), "learner tests");
    const updated = {
      ...nextBundle({ "README.md": "new readme", [tests]: "new test" }),
      manifest: old.manifest,
    };
    const onUpdated = vi.fn();
    await installTask(training, updated, { onUpdated });
    const backup = path.join(taskRoot, ".stella/previous", bundle.contentHash.slice(0, 12));
    expect(onUpdated).toHaveBeenCalledWith(backup);
    expect(await readFile(path.join(backup, "README.md"), "utf8")).toBe("learner notes");
    expect(await readFile(path.join(backup, tests), "utf8")).toBe("learner tests");
    expect(await readFile(path.join(taskRoot, "README.md"), "utf8")).toBe("new readme");
    expect(await readFile(path.join(taskRoot, tests), "utf8")).toBe("new test");
    await expect(readFile(path.join(backup, ".stella/task.json"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
  it("更新の途中で配布記録の公開に失敗したら配布物も元に戻して再試行できる", async () => {
    const training = await root();
    const taskRoot = await installTask(training, bundle);
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(rename).mockImplementation(async (source, target) => {
      if (target === path.join(taskRoot, receiptPath)) throw new Error("receipt publish failed");
      await actual.rename(source, target);
    });
    const updated = nextBundle({ "README.md": "new readme", "new.txt": "new" });
    await expect(installTask(training, updated)).rejects.toThrow("receipt publish failed");
    expect(await readFile(path.join(taskRoot, "README.md"), "utf8")).toBe("課題文");
    await expect(readFile(path.join(taskRoot, "new.txt"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(await readReceipt(taskRoot)).toMatchObject({ contentHash: bundle.contentHash });
    vi.mocked(rename).mockReset();
    await expect(installTask(training, updated)).resolves.toBe(taskRoot);
  });
  it("巻き戻しの途中で終了しても次に開くと元のバージョンに戻る", async () => {
    const training = await root();
    const taskRoot = await installTask(training, bundle);
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(rename).mockImplementation(async (source, target) => {
      if (
        target === path.join(taskRoot, receiptPath) ||
        path.basename(String(source)).startsWith("before-")
      )
        throw new Error("interrupted");
      await actual.rename(source, target);
    });
    await expect(installTask(training, nextBundle({ "README.md": "new readme" }))).rejects.toThrow(
      "interrupted",
    );
    expect(await readFile(path.join(taskRoot, "README.md"), "utf8")).toBe("new readme");
    vi.mocked(rename).mockReset();
    await expect(installTask(training, bundle)).resolves.toBe(taskRoot);
    expect(await readFile(path.join(taskRoot, "README.md"), "utf8")).toBe("課題文");
    expect(await readReceipt(taskRoot)).toMatchObject({ contentHash: bundle.contentHash });
  });
  it("前のハッシュが取得できないときは更新しない", async () => {
    const training = await root();
    const taskRoot = await installTask(training, bundle);
    const old = { taskId: bundle.manifest.id, contentHash: bundle.contentHash };
    await writeFile(path.join(taskRoot, receiptPath), JSON.stringify(old));
    const loadRevisionFiles = vi.fn().mockRejectedValue(new Error("404"));
    const conflict = await conflictOf(
      installTask(training, nextBundle({ "README.md": "new readme" }), { loadRevisionFiles }),
    );
    expect(loadRevisionFiles).toHaveBeenCalledWith(old.taskId, old.contentHash);
    expect(conflict.reason).toBe("updated");
    expect(await readReceipt(taskRoot)).toEqual(old);
    expect(await readFile(path.join(taskRoot, "README.md"), "utf8")).toBe("課題文");
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
    ).toEqual({
      taskId: bundle.manifest.id,
      contentHash: bundle.contentHash,
      files: makeHashes(bundle.files),
    });
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
  it("再オープン時に配布ファイルが課題フォルダーの中へのリンクでも不足として示す", async () => {
    const training = await root();
    const withTests: TaskBundle = {
      ...bundle,
      files: { ...bundle.files, "tests/a.test.js": Buffer.from("test").toString("base64") },
    };
    const installed = await installTask(training, withTests);
    await writeFile(path.join(installed, "notes.txt"), "learner notes");
    await rm(path.join(installed, "README.md"));
    await symlink(path.join(installed, "notes.txt"), path.join(installed, "README.md"));
    // 途中のフォルダーがリンクでも同じ (中身が同じでも配布物とはみなさない)。
    await rename(path.join(installed, "tests"), path.join(installed, "my-tests"));
    await symlink(path.join(installed, "my-tests"), path.join(installed, "tests"));
    const conflict = await conflictOf(installTask(training, withTests));
    expect(conflict.reason).toBe("damaged");
    expect(conflict.files.sort()).toEqual(["README.md", "tests/a.test.js"]);
  });
  it("横に配る途中でフォルダーをリンクに差し替えられても、学習フォルダーの外に書かない", async () => {
    const training = await root();
    const elsewhere = await root();
    const target = path.join(training, "course/unit/q1");
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, "notes.txt"), "learner notes");
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    // 最初のファイル (index.js) を書いた直後、用意済みの .stella を外へのリンクに差し替える。
    vi.mocked(writeFile).mockImplementationOnce(async (...args) => {
      await actual.writeFile(...args);
      await actual.rename(path.join(target, ".stella"), path.join(target, ".stella-moved"));
      await symlink(elsewhere, path.join(target, ".stella"));
    });
    await expect(installTask(training, bundle)).rejects.toThrow("通常のフォルダー");
    expect(await readdir(elsewhere)).toEqual([]);
    expect(await readFile(path.join(target, "notes.txt"), "utf8")).toBe("learner notes");
    // 自分が書いたファイルは片付ける。
    expect((await readdir(target)).sort()).toEqual([".stella", ".stella-moved", "notes.txt"]);
  });
  it("初めての配布の途中で親フォルダーをリンクに差し替えられても、外に書かない", async () => {
    const training = await root();
    const elsewhere = await root();
    const unit = path.join(training, "course/unit");
    await mkdir(unit, { recursive: true });
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(writeFile).mockImplementationOnce(async (...args) => {
      await actual.writeFile(...args);
      await actual.rename(unit, path.join(training, "course/unit-moved"));
      await symlink(elsewhere, unit);
    });
    await expect(installTask(training, bundle)).rejects.toThrow("通常のフォルダー");
    expect(await readdir(elsewhere)).toEqual([]);
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
      files: makeHashes(fixedStart.files),
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

describe("段階のある課題の配布", () => {
  const manifest = {
    ...bundle.manifest,
    problemSteps: true as const,
    problems: [
      { id: "q01", title: "問1" },
      { id: "q02", title: "問2" },
    ],
    submit: { files: ["src/**/*.ts"] },
    protected: ["package.json", "tests/**"],
  };
  const withProblems = {
    ...bundle,
    manifest,
    files: Object.fromEntries(
      Object.entries({
        ...Object.fromEntries(
          Object.entries(bundle.files).map(([name, encoded]) => [
            name,
            Buffer.from(encoded, "base64").toString(),
          ]),
        ),
        "package.json": "{}",
        "src/q01.ts": "starter 1",
        "tests/q01.test.ts": "test 1",
        "src/q02.ts": "starter 2",
        "tests/q02.test.ts": "test 2",
        ".stella/task.json": JSON.stringify(manifest),
      }).map(([name, contents]) => [name, Buffer.from(contents).toString("base64")]),
    ),
  };
  const firstOnly = new Set(["q01"]);
  const both = new Set(["q01", "q02"]);

  it("設定・解ける問題だけを配り、解放で足す。配ったファイルの削除は衝突として示す", async () => {
    const training = await root();
    const taskRoot = await installTask(training, withProblems, { visibleProblems: firstOnly });
    expect(await readdir(path.join(taskRoot, "src"))).toEqual(["q01.ts"]);
    expect(await readdir(path.join(taskRoot, "tests"))).toEqual(["q01.test.ts"]);
    expect(await readFile(path.join(taskRoot, "package.json"), "utf8")).toBe("{}");
    expect(await installTask(training, withProblems, { visibleProblems: firstOnly })).toBe(
      taskRoot,
    );
    const paths = ["package.json", "tests/q01.test.ts"];
    const protection = await protectedTaskFiles(taskRoot, manifest, paths, "q01");
    expect(protection.files).toEqual(paths);
    expect(protection.references).toEqual([
      expect.objectContaining({
        path: "tests/q02.test.ts",
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    ]);
    await writeFile(path.join(taskRoot, "src/q01.ts"), "learner answer");
    await Promise.all([
      unlockTaskFiles(taskRoot, withProblems, both),
      unlockTaskFiles(taskRoot, withProblems, both),
    ]);
    expect(await readFile(path.join(taskRoot, "src/q01.ts"), "utf8")).toBe("learner answer");
    expect(await readFile(path.join(taskRoot, "src/q02.ts"), "utf8")).toBe("starter 2");
    expect(await readFile(path.join(taskRoot, "tests/q02.test.ts"), "utf8")).toBe("test 2");
    expect(
      (await protectedTaskFiles(taskRoot, manifest, [...paths, "tests/q02.test.ts"], "q01"))
        .references,
    ).toEqual([]);
    await rm(path.join(taskRoot, "src/q02.ts"));
    const conflict = await conflictOf(unlockTaskFiles(taskRoot, withProblems, both));
    expect(conflict.reason).toBe("damaged");
    expect(conflict.files).toEqual(["src/q02.ts"]);
  });

  it("新しいバージョンに移っても未表示の問題は解放後にだけ配る", async () => {
    const training = await root();
    const taskRoot = await installTask(training, withProblems, { visibleProblems: firstOnly });
    await writeFile(path.join(taskRoot, "src/q01.ts"), "learner answer");
    const updated = {
      ...withProblems,
      contentHash: "b".repeat(64),
      files: {
        ...withProblems.files,
        "src/q02.ts": Buffer.from("new starter 2").toString("base64"),
      },
    };
    await installTask(training, updated, { visibleProblems: firstOnly });
    expect(await readFile(path.join(taskRoot, "src/q01.ts"), "utf8")).toBe("learner answer");
    expect(await readdir(path.join(taskRoot, "src"))).toEqual(["q01.ts"]);
    expect(await readdir(path.join(taskRoot, "tests"))).toEqual(["q01.test.ts"]);
    expect((await readReceipt(taskRoot)).files).not.toHaveProperty(["src/q02.ts"]);
    await unlockTaskFiles(taskRoot, updated, both);
    expect(await readFile(path.join(taskRoot, "src/q02.ts"), "utf8")).toBe("new starter 2");
    expect((await readReceipt(taskRoot)).files).toEqual(makeHashes(updated.files));
  });

  it("あとから解放する場所の衝突を示し、学習者のファイルを保持する", async () => {
    const training = await root();
    const taskRoot = await installTask(training, withProblems, { visibleProblems: firstOnly });
    await writeFile(path.join(taskRoot, "src/q02.ts"), "existing answer");
    const conflict = await conflictOf(unlockTaskFiles(taskRoot, withProblems, both));
    expect(conflict.reason).toBe("occupied");
    expect(conflict.files).toContain("src/q02.ts");
    expect(await readFile(path.join(taskRoot, "src/q02.ts"), "utf8")).toBe("existing answer");
    expect(await readdir(path.join(taskRoot, "tests"))).toEqual(["q01.test.ts"]);
  });

  it("解放状態が分からない初回と、段階のない課題は全ファイルを配る", async () => {
    const gated = await installTask(await root(), withProblems);
    const { problemSteps: _, ...ordinary } = manifest;
    const ungated = await installTask(
      await root(),
      { ...withProblems, manifest: ordinary },
      { visibleProblems: firstOnly },
    );
    for (const taskRoot of [gated, ungated])
      expect(await readdir(path.join(taskRoot, "src"))).toEqual(["q01.ts", "q02.ts"]);
  });
});
