import { describe, expect, it } from "vitest";
import { buildVscodeLessonUri, buildVscodeLinkUri, buildVscodeTaskUri } from "./uris.js";

describe("vscode uris", () => {
  it("builds a link uri", () => {
    expect(buildVscodeLinkUri("ABCD2345")).toBe(
      "vscode://saedgewell.stella-lms/link?code=ABCD2345",
    );
  });

  // TODO(stage-rename-compat): 旧拡張(<=0.1.0)互換。 拡張更新の浸透後に courseId を落とす
  it("builds a lesson uri (旧拡張向けに courseId も載せる)", () => {
    expect(buildVscodeLessonUri("stage-1", "lesson-1")).toBe(
      "vscode://saedgewell.stella-lms/lesson?stageId=stage-1&courseId=stage-1&lessonId=lesson-1",
    );
  });

  it("carries a link code so the extension can connect from the lesson uri", () => {
    expect(buildVscodeLessonUri("stage-1", "lesson-1", "ABCD2345")).toBe(
      "vscode://saedgewell.stella-lms/lesson?stageId=stage-1&courseId=stage-1&lessonId=lesson-1&code=ABCD2345",
    );
  });
});

describe("task uris", () => {
  it("既存の課題リンクの形を保つ", () => {
    expect(buildVscodeTaskUri("stage/u01/q01", "link")).toBe(
      "vscode://saedgewell.stella-lms/task?taskId=stage%2Fu01%2Fq01&code=link",
    );
  });

  it("問題 ID と接続コードをそれぞれエンコードする", () => {
    expect(buildVscodeTaskUri("stage/u01/q01", "link&code", "q1 + 2")).toBe(
      "vscode://saedgewell.stella-lms/task?taskId=stage%2Fu01%2Fq01&problem=q1+%2B+2&code=link%26code",
    );
    expect(buildVscodeTaskUri("task", undefined, "q1")).toBe(
      "vscode://saedgewell.stella-lms/task?taskId=task&problem=q1",
    );
  });
});
