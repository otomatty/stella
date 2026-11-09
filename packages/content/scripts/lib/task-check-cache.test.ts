import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { directoryFingerprint, taskCheckCacheKey } from "./task-check-cache.js";

const base = {
  bundle: { manifest: { id: "a" }, files: { "src/a.cs": "YQ==" }, contentHash: "ab" },
  solution: { "solution/src/a.cs": "Yg==" },
  mutants: { m1: { "src/a.cs": "Yw==" } },
  fixedStart: { "src/a.cs": "ZA==" },
  toolFingerprint: "tool",
};

describe("taskCheckCacheKey", () => {
  it("同じ中身は同じ鍵、どれか変えると鍵が変わる", () => {
    const key = taskCheckCacheKey(base);
    expect(taskCheckCacheKey({ ...base, mutants: undefined })).not.toBe(key);
    expect(taskCheckCacheKey({ ...base })).toBe(key);
    expect(taskCheckCacheKey({ ...base, solution: { "solution/src/a.cs": "eA==" } })).not.toBe(key);
    expect(taskCheckCacheKey({ ...base, bundle: { ...base.bundle, contentHash: "cd" } })).not.toBe(
      key,
    );
    expect(taskCheckCacheKey({ ...base, mutants: { m1: { "src/a.cs": "eQ==" } } })).not.toBe(key);
    expect(taskCheckCacheKey({ ...base, fixedStart: { "src/a.cs": "Zg==" } })).not.toBe(key);
    expect(taskCheckCacheKey({ ...base, toolFingerprint: "other" })).not.toBe(key);
    expect(key).toMatch(/^[a-f0-9]{64}$/);
  });

  it("キーの並びが違っても同じ鍵", () => {
    const a = taskCheckCacheKey({
      toolFingerprint: "tool",
      fixedStart: { b: "1", a: "2" },
      mutants: {},
      solution: { z: "9", a: "8" },
      bundle: base.bundle,
    });
    const b = taskCheckCacheKey({
      bundle: base.bundle,
      solution: { a: "8", z: "9" },
      mutants: {},
      fixedStart: { a: "2", b: "1" },
      toolFingerprint: "tool",
    });
    expect(a).toBe(b);
  });
});

describe("directoryFingerprint", () => {
  it("ファイルの中身が変わると指紋が変わる", () => {
    const root = mkdtempSync(join(tmpdir(), "stella-tool-fp-"));
    const dir = join(root, "runner");
    mkdirSync(dir);
    writeFileSync(join(dir, "a.ts"), "export const n = 1;\n");
    const same = directoryFingerprint([{ root: dir, base: root }]);
    expect(directoryFingerprint([{ root: dir, base: root }])).toBe(same);
    writeFileSync(join(dir, "a.ts"), "export const n = 2;\n");
    expect(directoryFingerprint([{ root: dir, base: root }])).not.toBe(same);
  });
});
