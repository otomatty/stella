import { describe, expect, it } from "vitest";
import { buildVscodeLessonUri, buildVscodeLinkUri } from "./uris.js";

describe("vscode uris", () => {
  it("builds a link uri", () => {
    expect(buildVscodeLinkUri("ABCD2345")).toBe("vscode://falcon.informal/link?code=ABCD2345");
  });

  // TODO(stage-rename-compat): 旧拡張(<=0.1.0)互換。 拡張更新の浸透後に courseId を落とす
  it("builds a lesson uri (旧拡張向けに courseId も載せる)", () => {
    expect(buildVscodeLessonUri("stage-1", "lesson-1")).toBe(
      "vscode://falcon.informal/lesson?stageId=stage-1&courseId=stage-1&lessonId=lesson-1",
    );
  });

  it("carries a link code so the extension can connect from the lesson uri", () => {
    expect(buildVscodeLessonUri("stage-1", "lesson-1", "ABCD2345")).toBe(
      "vscode://falcon.informal/lesson?stageId=stage-1&courseId=stage-1&lessonId=lesson-1&code=ABCD2345",
    );
  });
});
