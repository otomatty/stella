import { describe, expect, it } from "vitest";
import { alignReference } from "./reference-align";
import { highlightSubmission } from "./submission-highlight";

function align(submitted: string, reference: string, path = "src/example.ts") {
  return alignReference(
    highlightSubmission(submitted, path),
    path,
    highlightSubmission(reference, path),
    path,
  ).map(({ submitted, reference }) => [
    submitted && [submitted.startLine, submitted.endLine],
    reference && [reference.startLine, reference.endLine],
  ]);
}

describe("alignReference", () => {
  it("pairs declarations in the same order despite different lengths", () => {
    expect(
      align(
        "function a() {\n  return 1;\n}\nconst b = 2;",
        "export function a() { return 1; }\nexport const b = 2;",
      ),
    ).toEqual([
      [
        [1, 3],
        [1, 1],
      ],
      [
        [4, 4],
        [2, 2],
      ],
    ]);
  });

  it("matches by name and keeps the submitted order and original line numbers", () => {
    expect(align("const a = 1;\nconst b = 2;", "const b = 2;\nconst a = 1;")).toEqual([
      [
        [1, 1],
        [2, 2],
      ],
      [
        [2, 2],
        [1, 1],
      ],
    ]);
  });

  it("keeps submitted-only declarations in place and appends reference-only declarations", () => {
    expect(
      align(
        "const left = 1;\nconst shared = 2;",
        "const first = 1;\nconst shared = 2;\nconst last = 3;",
      ),
    ).toEqual([
      [[1, 1], null],
      [
        [2, 2],
        [2, 2],
      ],
      [null, [1, 1]],
      [null, [3, 3]],
    ]);
  });

  it("pairs the comments and imports before the first declaration", () => {
    expect(
      align("// comment\n\nimport { x } from './x';\nconst a = x;", "// explanation\nconst a = 1;"),
    ).toEqual([
      [
        [1, 3],
        [1, 1],
      ],
      [
        [4, 4],
        [2, 2],
      ],
    ]);
    expect(align("// comment\nconst a = 1;", "const a = 1;")).toEqual([
      [[1, 1], null],
      [
        [2, 2],
        [1, 1],
      ],
    ]);
  });

  it("recognizes async functions, typed constants and classes, ignoring nested declarations", () => {
    expect(
      align(
        "export default async function a() {\nconst inner = /}/;\nconst nested = true;\n}\nexport const b: number = 2;\nclass C {}",
        "export class C {}\nasync function a() {}\nconst b = 2;",
      ),
    ).toEqual([
      [
        [1, 4],
        [2, 2],
      ],
      [
        [5, 5],
        [3, 3],
      ],
      [
        [6, 6],
        [1, 1],
      ],
    ]);
  });

  it("ignores declarations inside multiline comments and template strings", () => {
    expect(
      align(
        "/*\nconst commented = 1;\n*/\nconst message = `\nfunction fake() {}\n`;\nconst last = 2;",
        "const message = '';\nconst last = 2;",
      ),
    ).toEqual([
      [[1, 3], null],
      [
        [4, 6],
        [1, 1],
      ],
      [
        [7, 7],
        [2, 2],
      ],
    ]);
  });

  it("uses one row for files without declarations and for other languages", () => {
    expect(align("// first\nwork();", "work();")).toEqual([
      [
        [1, 2],
        [1, 1],
      ],
    ]);
    expect(align("class A {}\nclass B {}", "class B {}\nclass A {}", "Example.cs")).toEqual([
      [
        [1, 2],
        [1, 2],
      ],
    ]);
  });

  it("preserves CRLF line numbering", () => {
    expect(
      align("// start\r\nconst a = 1;\r\nconst b = 2;\r\n", "const b = 2;\r\nconst a = 1;"),
    ).toEqual([
      [[1, 1], null],
      [
        [2, 2],
        [2, 2],
      ],
      [
        [3, 4],
        [1, 1],
      ],
    ]);
  });
});
