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
import { installTask } from "./task-distribution.js";
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
describe("課題の配布", () => {
  it("同じ課題を開き直しても編集したファイルを上書きしない", async () => {
    const training = await root();
    const taskRoot = await installTask(training, bundle);
    await writeFile(path.join(taskRoot, "index.js"), "learner code");
    expect(await installTask(training, bundle)).toBe(taskRoot);
    expect(await readFile(path.join(taskRoot, "index.js"), "utf8")).toBe("learner code");
    await expect(installTask(training, { ...bundle, contentHash: "b".repeat(64) })).rejects.toThrow(
      "教材が更新",
    );
  });
  it("配布先が既存のリンクなら書き込まない", async () => {
    const training = await root();
    const elsewhere = await root();
    await symlink(elsewhere, path.join(training, "course"));
    await expect(installTask(training, bundle)).rejects.toThrow("通常のフォルダー");
  });
  it("初回のファイル衝突も上書きしない", async () => {
    const training = await root();
    const installed = await installTask(training, bundle);
    await rm(path.join(installed, ".stella/distribution.json"));
    await expect(installTask(training, bundle)).rejects.toThrow("衝突");
    expect(await readFile(path.join(installed, "index.js"), "utf8")).toBe("starter");
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
    "%s が欠けていたら復旧方法を示し、学習者の編集を保持する",
    async (file) => {
      const training = await root();
      const installed = await installTask(training, bundle);
      await writeFile(path.join(installed, "index.js"), "learner code");
      await rm(path.join(installed, file));
      await expect(installTask(training, bundle)).rejects.toThrow("退避してから");
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
  it("初回の空フォルダーには配布でき、既存の学習者ファイルは除去しない", async () => {
    const training = await root();
    const target = path.join(training, "course/unit/q1");
    await mkdir(target, { recursive: true });
    expect(await installTask(training, bundle)).toBe(target);
    await rm(target, { recursive: true });
    await mkdir(target);
    await writeFile(path.join(target, "notes.txt"), "learner notes");
    await expect(installTask(training, bundle)).rejects.toThrow("衝突");
    expect(await readFile(path.join(target, "notes.txt"), "utf8")).toBe("learner notes");
  });
  it("再オープン時に配布ファイルが外へのリンクなら復旧を案内する", async () => {
    const training = await root();
    const elsewhere = await root();
    const installed = await installTask(training, bundle);
    await writeFile(path.join(elsewhere, "README.md"), "outside");
    await rm(path.join(installed, "README.md"));
    await symlink(path.join(elsewhere, "README.md"), path.join(installed, "README.md"));
    await expect(installTask(training, bundle)).rejects.toThrow("不足しているか不正");
  });
});
