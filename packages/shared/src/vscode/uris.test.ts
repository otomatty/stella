import { describe, expect, it } from "vitest";
import { buildVscodeLessonUri, buildVscodeLinkUri } from "./uris.js";

describe("vscode uris", () => {
  it("builds a link uri", () => {
    expect(buildVscodeLinkUri("ABCD2345")).toBe("vscode://falcon.informal/link?code=ABCD2345");
  });

  it("builds a lesson uri", () => {
    expect(buildVscodeLessonUri("course-1", "lesson-1")).toBe(
      "vscode://falcon.informal/lesson?courseId=course-1&lessonId=lesson-1",
    );
  });
});
