import { describe, expect, it } from "vitest";
import type { Assignment } from "@stella/shared/types";
import { lintAssignment } from "./lint.js";

function jsAssignment(language: Assignment["language"] = "javascript"): Assignment {
  return {
    id: "lint-1",
    stage: "S1",
    chapterId: "Ch01",
    sequence: 1,
    title: "Lint",
    newConcept: "",
    estimatedMinutes: 3,
    difficulty: 1,
    testKind: "stdout",
    description: "",
    language,
    starterFiles: [{ path: "main.js", content: "" }],
    tests: [{ name: "ok", expectedStdout: "ok" }],
    lintPreset: "S1",
    staticAnalysis: {
      ast: { required: [{ kind: "console-log" }], forbidden: [] },
    },
  };
}

describe("lintAssignment", () => {
  it("reports no-var as an error for S1 JavaScript", () => {
    const { lint } = lintAssignment("var x = 1;\nconsole.log(x);", jsAssignment());
    expect(lint.some((v) => v.ruleId === "no-var" && v.severity === 2)).toBe(true);
  });

  it("marks required console.log as found", () => {
    const { ast } = lintAssignment("console.log(1);", jsAssignment());
    expect(ast.required).toHaveLength(1);
    expect(ast.required[0]?.found).toBe(true);
  });

  it("returns empty lint and ast for SQL", () => {
    const { lint, ast } = lintAssignment("SELECT 1;", jsAssignment("sql"));
    expect(lint).toEqual([]);
    expect(ast).toEqual({ required: [], forbidden: [] });
  });
});
