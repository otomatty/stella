import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { TaskBundle } from "@stella/shared/tasks/catalog";
import { installTask } from "./task-distribution.js";
const dirs: string[] = [];
afterEach(async () => {
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
});
