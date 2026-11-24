import {
  link,
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
  pendingProblemBundle,
  protectedTaskFiles,
  TaskInstallConflict,
  unlockTaskFiles,
} from "./task-distribution.js";
import { listFiles, matchEditableFiles, sha256Hex } from "./runner/files.js";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    link: vi.fn(actual.link),
    writeFile: vi.fn(actual.writeFile),
    rename: vi.fn(actual.rename),
  };
});
const dirs: string[] = [];
afterEach(async () => {
  vi.mocked(link).mockReset();
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
    const manifest = {
      ...bundle.manifest,
      submit: { files: ["**/*"] },
      protected: [tests, "README.md"],
    };
    const old = {
      ...bundle,
      manifest,
      files: {
        ...bundle.files,
        [tests]: Buffer.from("test").toString("base64"),
        ".stella/task.json": Buffer.from(JSON.stringify(manifest)).toString("base64"),
      },
    };
    const taskRoot = await installTask(training, old);
    await writeFile(path.join(taskRoot, "README.md"), "learner notes");
    await writeFile(path.join(taskRoot, tests), "learner tests");
    const updated = {
      ...nextBundle({
        "README.md": "new readme",
        [tests]: "new test",
        ".stella/task.json": JSON.stringify(manifest),
      }),
      manifest,
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
  it.each([0, 1, 2, 3, 4, 5])(
    "%s ファイルの公開後に中断しても同じ更新を完了できる",
    async (stop) => {
      const training = await root();
      const manifest = { ...bundle.manifest, submit: { files: ["index.js", "other.js"] } };
      const before = {
        ...bundle,
        manifest,
        files: {
          ...bundle.files,
          "other.js": Buffer.from("old starter").toString("base64"),
          ".stella/task.json": Buffer.from(JSON.stringify(manifest)).toString("base64"),
        },
      };
      const taskRoot = await installTask(training, before);
      await writeFile(path.join(taskRoot, "index.js"), "learner code");
      await writeFile(path.join(taskRoot, "README.md"), "learner notes");

      const nextManifest = { ...manifest, title: "新しい課題" };
      const updated = {
        ...nextBundle({
          "README.md": "new readme",
          "other.js": "new starter",
          "new.txt": "new",
          ".stella/task.json": JSON.stringify(nextManifest),
        }),
        manifest: nextManifest,
      };
      const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
      let completed = 0;
      function stopIfNeeded() {
        if (completed === stop) throw new Error("interrupted");
        completed++;
      }
      vi.mocked(rename).mockImplementation(async (source, target) => {
        if (path.basename(String(source)) !== "updating-receipt") stopIfNeeded();
        await actual.rename(source, target);
      });
      vi.mocked(link).mockImplementation(async (...args) => {
        stopIfNeeded();
        await actual.link(...args);
      });

      await expect(installTask(training, updated)).rejects.toThrow("interrupted");
      expect(await readReceipt(taskRoot)).toMatchObject({
        contentHash: before.contentHash,
        updatingTo: updated.contentHash,
        files: makeHashes(before.files),
      });
      vi.mocked(rename).mockReset();
      vi.mocked(link).mockReset();

      await expect(installTask(training, updated)).resolves.toBe(taskRoot);
      expect(await readFile(path.join(taskRoot, "index.js"), "utf8")).toBe("learner code");
      expect(await readFile(path.join(taskRoot, "other.js"), "utf8")).toBe("new starter");
      expect(await readFile(path.join(taskRoot, "README.md"), "utf8")).toBe("new readme");
      expect(await readFile(path.join(taskRoot, "new.txt"), "utf8")).toBe("new");
      expect(
        await readFile(path.join(taskRoot, ".stella/previous/aaaaaaaaaaaa/README.md"), "utf8"),
      ).toBe("learner notes");
      expect(await readReceipt(taskRoot)).toMatchObject({
        contentHash: updated.contentHash,
        files: makeHashes(updated.files),
      });
    },
  );

  it("以前の更新の控えが残っていても、読まずに更新できる", async () => {
    const training = await root();
    const taskRoot = await installTask(training, bundle);
    const oldJournal = path.join(taskRoot, ".stella/.distribution-update");
    await mkdir(oldJournal);
    await writeFile(path.join(oldJournal, "plan.json"), "invalid json");
    const updated = nextBundle({ "README.md": "new readme" });

    await expect(installTask(training, updated)).resolves.toBe(taskRoot);
    expect(await readFile(path.join(oldJournal, "plan.json"), "utf8")).toBe("invalid json");
    expect((await readReceipt(taskRoot)).contentHash).toBe(updated.contentHash);
  });

  it("古いバージョンの編集対象が保護対象に変わっても、編集済みなら書く前に止める", async () => {
    const training = await root();
    const taskRoot = await installTask(training, {
      ...bundle,
      files: {
        ...bundle.files,
        ".stella/task.json": Buffer.from(JSON.stringify(bundle.manifest)).toString("base64"),
      },
    });
    await writeFile(path.join(taskRoot, "index.js"), "learner code");
    const manifest = { ...bundle.manifest, protected: ["index.js"] };
    const updated = {
      ...nextBundle({
        "README.md": "new readme",
        "index.js": "new starter",
        ".stella/task.json": JSON.stringify(manifest),
      }),
      manifest,
    };

    const conflict = await conflictOf(installTask(training, updated));
    expect(conflict.files).toEqual(["index.js"]);
    expect(await readFile(path.join(taskRoot, "index.js"), "utf8")).toBe("learner code");
    expect(await readFile(path.join(taskRoot, "README.md"), "utf8")).toBe("課題文");
    expect((await readReceipt(taskRoot)).contentHash).toBe(bundle.contentHash);
  });

  it("古い設定が書き換えられていたら、保護対象に移った編集済みファイルを更新しない", async () => {
    const training = await root();
    const old = nextBundle({ ".stella/task.json": JSON.stringify(bundle.manifest) });
    old.contentHash = bundle.contentHash;
    const taskRoot = await installTask(training, old);
    const manifestPath = path.join(taskRoot, ".stella/task.json");
    const changedManifest = JSON.stringify({ ...bundle.manifest, title: "learner title" });
    await writeFile(manifestPath, changedManifest);
    await writeFile(path.join(taskRoot, "index.js"), "learner code");
    const manifest = { ...bundle.manifest, protected: ["index.js"] };
    const updated = {
      ...nextBundle({
        ".stella/task.json": JSON.stringify(manifest),
        "index.js": "new starter",
        "README.md": "new readme",
      }),
      manifest,
    };

    const conflict = await conflictOf(installTask(training, updated));
    expect(conflict.reason).toBe("updated");
    expect(conflict.files).toEqual(["index.js", ".stella/task.json"]);
    expect(await readFile(manifestPath, "utf8")).toBe(changedManifest);
    expect(await readFile(path.join(taskRoot, "index.js"), "utf8")).toBe("learner code");
    expect(await readFile(path.join(taskRoot, "README.md"), "utf8")).toBe("課題文");
    expect(await readReceipt(taskRoot)).not.toHaveProperty("updatingTo");
  });

  it("新規ファイルの一時データが残っても、一覧に出さずに更新を再試行できる", async () => {
    const training = await root();
    const taskRoot = await installTask(training, bundle);
    const updated = nextBundle({ "src/new.txt": "new" });
    vi.mocked(link).mockImplementationOnce(async (source) => {
      expect(path.dirname(path.dirname(String(source)))).toBe(path.join(taskRoot, ".stella"));
      expect(await readFile(source, "utf8")).toBe("new");
      const leftover = path.join(taskRoot, ".stella/.distribution-staging-interrupted");
      await mkdir(leftover);
      await writeFile(path.join(leftover, "file"), "previous temporary content");
      throw new Error("interrupted before publication");
    });

    await expect(installTask(training, updated)).rejects.toThrow("interrupted before publication");
    await expect(readFile(path.join(taskRoot, "src/new.txt"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(await readdir(path.join(taskRoot, "src"))).toEqual([]);
    const listed = await listFiles(taskRoot);
    expect(listed).toEqual(["README.md", "index.js"]);
    expect(
      matchEditableFiles(listed, { ...bundle.manifest, submit: { files: ["**/*"] } }).files,
    ).toEqual(listed);

    await expect(installTask(training, updated)).resolves.toBe(taskRoot);
    expect(await readFile(path.join(taskRoot, "src/new.txt"), "utf8")).toBe("new");
    expect(await readdir(path.join(taskRoot, "src"))).toEqual(["new.txt"]);
  });

  it("別の内容の写しがあれば、元の写しを残して別名で退避する", async () => {
    const training = await root();
    const old = nextBundle({ ".stella/task.json": JSON.stringify(bundle.manifest) });
    old.contentHash = bundle.contentHash;
    const taskRoot = await installTask(training, old);
    const backup = path.join(taskRoot, ".stella/previous/aaaaaaaaaaaa");
    const notes = "learner's current notes";
    await mkdir(backup, { recursive: true });
    await writeFile(path.join(backup, "README.md"), "earlier notes");
    await writeFile(path.join(taskRoot, "README.md"), notes);
    const updated = {
      ...nextBundle({ "README.md": "new readme" }),
      files: { ...old.files, "README.md": Buffer.from("new readme").toString("base64") },
    };

    await expect(installTask(training, updated)).resolves.toBe(taskRoot);
    expect(await readFile(path.join(backup, "README.md"), "utf8")).toBe("earlier notes");
    const suffix = sha256Hex(Buffer.from(notes)).slice(0, 12);
    expect(await readFile(path.join(backup, `README.md.${suffix}`), "utf8")).toBe(notes);
    expect(await readFile(path.join(taskRoot, "README.md"), "utf8")).toBe("new readme");
  });

  it("ハードリンクが使えないフォルダーでも既存ファイルの更新と新規ファイルの追加ができる", async () => {
    vi.mocked(link).mockRejectedValue(
      Object.assign(new Error("hard link unsupported"), { code: "EPERM" }),
    );
    const training = await root();
    const taskRoot = await installTask(training, bundle);
    const updated = nextBundle({ "README.md": "new readme", "new.txt": "new" });

    await expect(installTask(training, updated)).resolves.toBe(taskRoot);
    expect(await readFile(path.join(taskRoot, "README.md"), "utf8")).toBe("new readme");
    expect(await readFile(path.join(taskRoot, "new.txt"), "utf8")).toBe("new");
    expect((await readReceipt(taskRoot)).contentHash).toBe(updated.contentHash);
    expect(link).toHaveBeenCalledWith(expect.any(String), path.join(taskRoot, "new.txt"));
  });

  it("検査後に保存されたコードを置き換えず、配布の更新を止める", async () => {
    const training = await root();
    const taskRoot = await installTask(training, bundle);
    const code = path.join(taskRoot, "index.js");
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(writeFile).mockImplementationOnce(async (...args) => {
      await actual.writeFile(...args);
      await actual.writeFile(code, "learner saved during update");
    });

    const updated = nextBundle({ "index.js": "new starter", "README.md": "new readme" });
    const { "README.md": readme, ...files } = updated.files;
    const conflict = await conflictOf(
      installTask(training, { ...updated, files: { "README.md": readme, ...files } }),
    );
    expect(conflict.files).toEqual(["index.js"]);
    expect(await readFile(code, "utf8")).toBe("learner saved during update");
    expect(await readFile(path.join(taskRoot, "README.md"), "utf8")).toBe("課題文");
    expect((await readReceipt(taskRoot)).contentHash).toBe(bundle.contentHash);
    expect(await readdir(path.join(taskRoot, ".stella"))).not.toContain(".distribution-update");
  });

  it("公開中の保存も、そのファイルを置き換える直前に検出する", async () => {
    const training = await root();
    const taskRoot = await installTask(training, bundle);
    const code = path.join(taskRoot, "index.js");
    const readmePath = path.join(taskRoot, "README.md");
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(rename).mockImplementation(async (source, target) => {
      await actual.rename(source, target);
      if (target === readmePath) await actual.writeFile(code, "learner saved after first file");
    });
    const updated = nextBundle({ "index.js": "new starter", "README.md": "new readme" });
    const { "README.md": readme, ...files } = updated.files;
    const conflict = await conflictOf(
      installTask(training, { ...updated, files: { "README.md": readme, ...files } }),
    );
    expect(conflict.files).toEqual(["index.js"]);
    expect(await readFile(code, "utf8")).toBe("learner saved after first file");
    expect(await readFile(readmePath, "utf8")).toBe("new readme");
    expect((await readReceipt(taskRoot)).contentHash).toBe(bundle.contentHash);
  });

  it("配布記録を更新できなくても、新規ファイルに保存された内容を残す", async () => {
    const training = await root();
    const taskRoot = await installTask(training, bundle);
    const added = path.join(taskRoot, "new.txt");
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(rename).mockImplementation(async (source, target) => {
      if (
        target === path.join(taskRoot, receiptPath) &&
        path.basename(String(source)) !== "updating-receipt"
      ) {
        await actual.writeFile(added, "learner saved before receipt");
        throw new Error("receipt publish failed");
      }
      await actual.rename(source, target);
    });

    await expect(installTask(training, nextBundle({ "new.txt": "new" }))).rejects.toThrow(
      "receipt publish failed",
    );
    expect(await readFile(added, "utf8")).toBe("learner saved before receipt");
    expect((await readReceipt(taskRoot)).contentHash).toBe(bundle.contentHash);
  });

  it.each([false, true])(
    "更新中に保存すると同じバージョンへの再試行だけで編集を引き継ぐ (更新先が変更 %s)",
    async (changedTarget) => {
      const training = await root();
      const taskRoot = await installTask(training, bundle);
      const code = path.join(taskRoot, "index.js");
      const readme = path.join(taskRoot, "README.md");
      const receipt = path.join(taskRoot, receiptPath);
      const updated = nextBundle({ "index.js": "new starter", "README.md": "new readme" });
      const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
      vi.mocked(rename).mockImplementation(async (source, target) => {
        if (target === receipt && path.basename(String(source)) !== "updating-receipt") {
          expect(await actual.readFile(code, "utf8")).toBe("new starter");
          expect(await actual.readFile(readme, "utf8")).toBe("new readme");
          await actual.writeFile(code, "learner saved after replacement");
          throw new Error("receipt publish failed");
        }
        await actual.rename(source, target);
      });

      await expect(installTask(training, updated)).rejects.toThrow("receipt publish failed");
      const pending = {
        taskId: bundle.manifest.id,
        contentHash: bundle.contentHash,
        files: makeHashes(bundle.files),
        updatingTo: updated.contentHash,
      };
      expect(await readReceipt(taskRoot)).toEqual(pending);
      vi.mocked(rename).mockReset();

      if (changedTarget) {
        const newer = {
          ...nextBundle({ "index.js": "another starter", "README.md": "another readme" }),
          contentHash: "c".repeat(64),
        };
        const conflict = await conflictOf(installTask(training, newer));
        expect(conflict.reason).toBe("updated");
        expect(conflict.files).toEqual(["index.js", "README.md"]);
        expect(await readReceipt(taskRoot)).toEqual(pending);
      } else {
        await expect(installTask(training, updated)).resolves.toBe(taskRoot);
        expect(await readReceipt(taskRoot)).toEqual({
          taskId: bundle.manifest.id,
          contentHash: updated.contentHash,
          files: makeHashes(updated.files),
        });
      }
      expect(await readFile(code, "utf8")).toBe("learner saved after replacement");
      expect(await readFile(readme, "utf8")).toBe("new readme");
    },
  );

  it("新規公開の直前に同じファイルができても上書きせずに続ける", async () => {
    const training = await root();
    const taskRoot = await installTask(training, bundle);
    const added = path.join(taskRoot, "new.txt");
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(link).mockImplementationOnce(async (source, target) => {
      await actual.writeFile(added, "new");
      await actual.link(source, target);
    });
    const updated = nextBundle({ "new.txt": "new" });

    await expect(installTask(training, updated)).resolves.toBe(taskRoot);
    expect(await readFile(added, "utf8")).toBe("new");
    expect((await readReceipt(taskRoot)).contentHash).toBe(updated.contentHash);
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
    vi.mocked(link).mockRejectedValue(
      Object.assign(new Error("hard link unsupported"), { code: "ENOTSUP" }),
    );
    await Promise.all([
      unlockTaskFiles(taskRoot, withProblems, both),
      unlockTaskFiles(taskRoot, withProblems, both),
    ]);
    expect(await readFile(path.join(taskRoot, "src/q01.ts"), "utf8")).toBe("learner answer");
    expect(await readFile(path.join(taskRoot, "src/q02.ts"), "utf8")).toBe("starter 2");
    expect(link).toHaveBeenCalledWith(expect.any(String), path.join(taskRoot, "src/q02.ts"));
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

  it.each([false, true])(
    "旧拡張の印が付いた問題を配布済みとして扱い、編集を残す (先に記録を移行 %s)",
    async (migrateFirst) => {
      const training = await root();
      const taskRoot = await installTask(training, withProblems, { visibleProblems: firstOnly });
      const { files: _, ...legacy } = await readReceipt(taskRoot);
      await writeFile(path.join(taskRoot, receiptPath), JSON.stringify(legacy));
      await writeFile(path.join(taskRoot, ".stella/installed-q02"), legacy.contentHash);
      await writeFile(path.join(taskRoot, "src/q02.ts"), "learner answer");
      const secondTest = "tests/q02.test.ts";
      await writeFile(path.join(taskRoot, secondTest), "test 2");

      expect(await pendingProblemBundle(taskRoot, manifest, both)).toBeUndefined();
      const protection = await protectedTaskFiles(
        taskRoot,
        manifest,
        ["package.json", "tests/q01.test.ts", secondTest],
        "q01",
      );
      expect(protection.references).toEqual([]);
      expect(protection.files).toContain(secondTest);
      if (migrateFirst) {
        await unlockTaskFiles(taskRoot, withProblems, both);
        expect(await readReceipt(taskRoot)).toMatchObject({
          deferred: {},
          files: makeHashes(withProblems.files),
        });
        expect((await readReceipt(taskRoot)).deferred).not.toHaveProperty([secondTest]);
      }

      const updated = {
        ...withProblems,
        contentHash: "b".repeat(64),
        files: {
          ...withProblems.files,
          [secondTest]: Buffer.from("new test 2").toString("base64"),
        },
      };
      const oldHashes = makeHashes(withProblems.files);
      delete oldHashes[secondTest];
      await expect(
        installTask(training, updated, {
          visibleProblems: firstOnly,
          loadRevisionFiles: async () => oldHashes,
        }),
      ).resolves.toBe(taskRoot);
      expect(await readFile(path.join(taskRoot, "src/q02.ts"), "utf8")).toBe("learner answer");
      expect(await readFile(path.join(taskRoot, secondTest), "utf8")).toBe("new test 2");
      expect((await readReceipt(taskRoot)).files).toEqual(makeHashes(updated.files));
    },
  );

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

  it.each([false, true])(
    "配布をやめた問題が未解放で戻ってもローカルの残りを配布済みにしない (古い記録 %s)",
    async (legacy) => {
      const training = await root();
      const taskRoot = await installTask(training, withProblems, { visibleProblems: both });
      await writeFile(path.join(taskRoot, "src/q02.ts"), "learner answer");
      const removedManifest = { ...manifest, problems: manifest.problems.slice(0, 1) };
      const removed = {
        ...withProblems,
        manifest: removedManifest,
        contentHash: "b".repeat(64),
        files: Object.fromEntries(
          Object.entries({
            ...withProblems.files,
            ".stella/task.json": Buffer.from(JSON.stringify(removedManifest)).toString("base64"),
          }).filter(([rel]) => !rel.includes("q02")),
        ),
      };
      await installTask(training, removed, { visibleProblems: firstOnly });
      if (legacy) {
        const { files: _, ...record } = await readReceipt(taskRoot);
        await writeFile(path.join(taskRoot, receiptPath), JSON.stringify(record));
      }
      const added = {
        ...withProblems,
        contentHash: "c".repeat(64),
        files: {
          ...withProblems.files,
          "src/q02.ts": Buffer.from("new starter").toString("base64"),
          "tests/q02.test.ts": Buffer.from("new test").toString("base64"),
        },
      };

      await installTask(training, added, {
        visibleProblems: firstOnly,
        loadRevisionFiles: async () => makeHashes(removed.files),
      });
      const record = await readReceipt(taskRoot);
      expect(record.files).not.toHaveProperty(["src/q02.ts"]);
      expect(record.deferred).toHaveProperty(["src/q02.ts"], null);
      expect(await readFile(path.join(taskRoot, "src/q02.ts"), "utf8")).toBe("learner answer");
      expect(await readFile(path.join(taskRoot, "tests/q02.test.ts"), "utf8")).toBe("test 2");
      const { files, references } = await protectedTaskFiles(
        taskRoot,
        manifest,
        ["package.json", "tests/q01.test.ts", "tests/q02.test.ts"],
        "q01",
      );
      expect(files).not.toContain("tests/q02.test.ts");
      expect(references).toContainEqual(
        expect.objectContaining({
          path: "tests/q02.test.ts",
          sha256: makeHashes(added.files)["tests/q02.test.ts"],
        }),
      );
    },
  );

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
