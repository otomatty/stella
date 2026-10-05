import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadTask, runTask } from "./run-task.js";

/** `apps/vscode/samples/` の見本が、定義として正しく、意図どおりの結果になること。 */
function sample(name: string): string {
  return fileURLToPath(new URL(`../../samples/${name}`, import.meta.url));
}

describe("samples", () => {
  it("first-page は定義が正しく、見出しを直す前は要修正になる", async () => {
    const loaded = await loadTask(sample("first-page"));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const result = await runTask({
      root: loaded.root,
      manifest: loaded.manifest,
      manifestSha256: loaded.manifestSha256,
      env: { PATH: "" },
    });
    expect(result.outcome).toBe("failed");
    const failed = result.steps[0]?.tests?.filter((t) => t.status === "failed");
    expect(failed?.map((t) => t.message)).toEqual([
      "<h1> の文字が「今日の学習予定」になっていません (いまは「Web学習を始めました」)",
    ]);
  });

  it("env-check は定義が正しい", async () => {
    const loaded = await loadTask(sample("env-check"));
    expect(loaded.ok).toBe(true);
  });
});
