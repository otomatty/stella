import { describe, expect, it } from "vitest";
import type { Assignment } from "../types.js";
import {
  assignmentIdFromExercisePath,
  exerciseRoot,
  exerciseRootForPath,
  filesToWrite,
  isPathInsideDir,
} from "./exercise-paths.js";

describe("exerciseRoot", () => {
  it("nests under .stella/exercises", () => {
    expect(exerciseRoot("/home/u", "asg-1").replace(/\\/g, "/")).toBe(
      "/home/u/.stella/exercises/asg-1",
    );
  });
});

describe("legacy exercise paths", () => {
  it("still finds assignments in saved legacy workspace folders", () => {
    expect(
      assignmentIdFromExercisePath("/home/u/.falcon-informal/exercises/asg-1/main.js", "/home/u"),
    ).toBe("asg-1");
  });

  it("grades the folder currently open instead of a different copy", () => {
    expect(
      exerciseRootForPath("/home/u", "asg-1", "/home/u/.falcon-informal/exercises/asg-1/main.js"),
    ).toBe("/home/u/.falcon-informal/exercises/asg-1");
    expect(exerciseRootForPath("/home/u", "asg-1", "/home/u/.stella/exercises/asg-1/main.js")).toBe(
      "/home/u/.stella/exercises/asg-1",
    );
    expect(
      exerciseRootForPath("/home/u", "asg-1", "/home/u/.falcon-informal/exercises/asg-10/main.js"),
    ).toBe("/home/u/.stella/exercises/asg-1");
  });
});

describe("isPathInsideDir", () => {
  it("accepts the directory and files under it", () => {
    expect(
      isPathInsideDir("/home/u/.stella/exercises/asg-1", "/home/u/.stella/exercises/asg-1"),
    ).toBe(true);
    expect(
      isPathInsideDir("/home/u/.stella/exercises/asg-1/main.js", "/home/u/.stella/exercises/asg-1"),
    ).toBe(true);
  });

  it("rejects a prefix-sibling exercise folder", () => {
    expect(
      isPathInsideDir(
        "/home/u/.stella/exercises/asg-10/main.js",
        "/home/u/.stella/exercises/asg-1",
      ),
    ).toBe(false);
  });

  it("accepts Windows paths", () => {
    expect(
      isPathInsideDir(
        "C:\\Users\\u\\.stella\\exercises\\asg-1\\main.js",
        "C:\\Users\\u\\.stella\\exercises\\asg-1",
      ),
    ).toBe(true);
  });
});

describe("assignmentIdFromExercisePath", () => {
  it("reads the assignment id from a file under the exercise folder", () => {
    expect(assignmentIdFromExercisePath("/home/u/.stella/exercises/asg-1/main.js", "/home/u")).toBe(
      "asg-1",
    );
  });

  it("returns undefined outside the exercise root", () => {
    expect(assignmentIdFromExercisePath("/home/u/other/main.js", "/home/u")).toBeUndefined();
  });

  it("finds an assignment when the home path has a trailing slash", () => {
    expect(
      assignmentIdFromExercisePath("/home/u/.stella/exercises/asg-1/main.js", "/home/u/"),
    ).toBe("asg-1");
  });

  it("accepts Windows paths", () => {
    expect(
      assignmentIdFromExercisePath(
        "C:\\Users\\u\\.stella\\exercises\\asg-1\\main.js",
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
