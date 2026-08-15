import { describe, expect, it } from "vitest";
import type { Assignment } from "../types.js";
import {
  assignmentIdFromExercisePath,
  exerciseRoot,
  filesToWrite,
  isPathInsideDir,
} from "./exercise-paths.js";

describe("exerciseRoot", () => {
  it("nests under .falcon-informal/exercises", () => {
    expect(exerciseRoot("/home/u", "asg-1").replace(/\\/g, "/")).toBe(
      "/home/u/.falcon-informal/exercises/asg-1",
    );
  });
});

describe("isPathInsideDir", () => {
  it("accepts the directory and files under it", () => {
    expect(
      isPathInsideDir(
        "/home/u/.falcon-informal/exercises/asg-1",
        "/home/u/.falcon-informal/exercises/asg-1",
      ),
    ).toBe(true);
    expect(
      isPathInsideDir(
        "/home/u/.falcon-informal/exercises/asg-1/main.js",
        "/home/u/.falcon-informal/exercises/asg-1",
      ),
    ).toBe(true);
  });

  it("rejects a prefix-sibling exercise folder", () => {
    expect(
      isPathInsideDir(
        "/home/u/.falcon-informal/exercises/asg-10/main.js",
        "/home/u/.falcon-informal/exercises/asg-1",
      ),
    ).toBe(false);
  });

  it("accepts Windows paths", () => {
    expect(
      isPathInsideDir(
        "C:\\Users\\u\\.falcon-informal\\exercises\\asg-1\\main.js",
        "C:\\Users\\u\\.falcon-informal\\exercises\\asg-1",
      ),
    ).toBe(true);
  });
});

describe("assignmentIdFromExercisePath", () => {
  it("reads the assignment id from a file under the exercise folder", () => {
    expect(
      assignmentIdFromExercisePath("/home/u/.falcon-informal/exercises/asg-1/main.js", "/home/u"),
    ).toBe("asg-1");
  });

  it("returns undefined outside the exercise root", () => {
    expect(assignmentIdFromExercisePath("/home/u/other/main.js", "/home/u")).toBeUndefined();
  });

  it("accepts Windows paths", () => {
    expect(
      assignmentIdFromExercisePath(
        "C:\\Users\\u\\.falcon-informal\\exercises\\asg-1\\main.js",
        "C:\\Users\\u",
      ),
    ).toBe("asg-1");
  });
});

const fixtureAssignment: Assignment = {
  id: "asg-1",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 1,
  title: "Demo",
  newConcept: "",
  estimatedMinutes: 3,
  difficulty: 1,
  testKind: "stdout",
  description: "",
  sqlSeed: "CREATE TABLE demo (id INTEGER);",
  starterFiles: [
    { path: "main.js", content: "// starter one\n" },
    { path: "utils.js", content: "// starter two\n", readonly: true },
  ],
  tests: [{ name: "stdout is ok", expectedStdout: "ok" }],
};

describe("filesToWrite", () => {
  it("returns starter file paths only", () => {
    const files = filesToWrite(fixtureAssignment);
    expect(files.map((file) => file.relPath)).toEqual(["main.js", "utils.js"]);
    expect(files).toEqual([
      { relPath: "main.js", content: "// starter one\n", readonly: false },
      { relPath: "utils.js", content: "// starter two\n", readonly: true },
    ]);
  });
});
