import { describe, expect, it } from "vitest";
import type { TaskManifest } from "./manifest.js";
import { problemFingerprints } from "./problems.js";

const definition = {
  runner: "ts-test",
  problems: [
    { id: "q1", title: "問1" },
    { id: "q2", title: "問2" },
  ],
  checks: { lint: true, format: false },
} satisfies Pick<TaskManifest, "runner" | "problems" | "checks">;

const files = {
  "src/q1.ts": btoa("first starter"),
  "tests/q1.test.ts": btoa("first test"),
  "src/q2.ts": btoa("second starter"),
  "tests/q2.test.ts": btoa("second test"),
  "package.json": btoa("{}"),
  "src/shared/helpers.ts": btoa("shared helper"),
  "README.md": btoa("read me"),
  ".stella/task.json": btoa("{}"),
  "hints.md": btoa("hints"),
};

describe("問題の指紋", () => {
  it("after・problemSteps・課題文とファイル一覧の順序は指紋に影響しない", async () => {
    const original = await problemFingerprints(definition, files);
    const changedDefinition = {
      ...definition,
      problemSteps: true as const,
      problems: definition.problems.map((problem) => ({ ...problem, after: "video" })).reverse(),
    };
    const changed = Object.fromEntries(Object.entries(files).reverse());
    changed["README.md"] = btoa("new instructions");
    changed[".stella/task.json"] = btoa("new manifest");
    changed["hints.md"] = btoa("new hints");
    expect(await problemFingerprints(changedDefinition, changed)).toEqual(original);
    expect(original.q1).toMatch(/^[0-9a-f]{64}$/);
  });

  it.each(["src/q1.ts", "tests/q1.test.ts"])(
    "%s が変わると、その問題の指紋だけ変わる",
    async (path) => {
      const original = await problemFingerprints(definition, files);
      const changed = await problemFingerprints(definition, { ...files, [path]: btoa("changed") });
      expect(changed.q1).not.toBe(original.q1);
      expect(changed.q2).toBe(original.q2);
    },
  );

  it.each(["package.json", "src/shared/helpers.ts"])(
    "共通の %s が変わると全問の指紋が変わる",
    async (path) => {
      const original = await problemFingerprints(definition, files);
      const changed = await problemFingerprints(definition, { ...files, [path]: btoa("changed") });
      expect(changed.q1).not.toBe(original.q1);
      expect(changed.q2).not.toBe(original.q2);
    },
  );

  it("問題の題名と実行手順を指紋に含める", async () => {
    const original = await problemFingerprints(definition, files);
    const renamed = await problemFingerprints(
      {
        ...definition,
        problems: [{ id: "q1", title: "新しい題名" }, definition.problems[1]],
      },
      files,
    );
    expect(renamed.q1).not.toBe(original.q1);
    expect(renamed.q2).toBe(original.q2);

    const differentRunner = await problemFingerprints(
      { ...definition, runner: "node-test" },
      files,
    );
    expect(differentRunner.q1).not.toBe(original.q1);
    const differentChecks = await problemFingerprints(
      { ...definition, checks: { lint: false, format: false } },
      files,
    );
    expect(differentChecks.q1).not.toBe(original.q1);
  });
});
