import { describe, expect, it } from "vitest";
import {
  PENDING_LESSON_KEY,
  consumePendingOnSuccess,
  isExtensionUriPath,
  loadLessonForUri,
  parseLinkCode,
  parsePendingLesson,
  readPendingLesson,
  requireDeepLinkedLesson,
  shouldResumeAfterLink,
  type PendingLesson,
} from "./deep-link.js";

describe("deep-link", () => {
  it("uses pendingLesson as the globalState key", () => {
    expect(PENDING_LESSON_KEY).toBe("pendingLesson");
  });

  it("accepts /lesson and lesson paths", () => {
    expect(isExtensionUriPath("/lesson", "lesson")).toBe(true);
    expect(isExtensionUriPath("lesson", "lesson")).toBe(true);
    expect(isExtensionUriPath("/link", "lesson")).toBe(false);
  });

  it("reads the connect code off a lesson uri", () => {
    expect(parseLinkCode("courseId=c1&lessonId=l1&code=ABCD2345")).toBe("ABCD2345");
    expect(parseLinkCode("courseId=c1&lessonId=l1")).toBeUndefined();
    expect(parseLinkCode("code=")).toBeUndefined();
  });

  it("accepts /link and link paths", () => {
    expect(isExtensionUriPath("/link", "link")).toBe(true);
    expect(isExtensionUriPath("link", "link")).toBe(true);
    expect(isExtensionUriPath("/lesson", "link")).toBe(false);
  });

  it("parses courseId and lessonId from a lesson query", () => {
    expect(parsePendingLesson("courseId=course-1&lessonId=lesson-1")).toEqual({
      courseId: "course-1",
      lessonId: "lesson-1",
    });
  });

  it("rejects a lesson query missing either id", () => {
    expect(parsePendingLesson("courseId=course-1")).toBeUndefined();
    expect(parsePendingLesson("lessonId=lesson-1")).toBeUndefined();
    expect(parsePendingLesson("")).toBeUndefined();
  });

  it("reads a stored pendingLesson object", () => {
    expect(readPendingLesson({ courseId: "c1", lessonId: "l1" })).toEqual({
      courseId: "c1",
      lessonId: "l1",
    });
  });

  it("rejects invalid pendingLesson values", () => {
    expect(readPendingLesson(undefined)).toBeUndefined();
    expect(readPendingLesson(null)).toBeUndefined();
    expect(readPendingLesson({ courseId: "c1" })).toBeUndefined();
    expect(readPendingLesson({ courseId: "", lessonId: "l1" })).toBeUndefined();
  });

  it("resumes pending only when this /link succeeded", () => {
    expect(shouldResumeAfterLink(true)).toBe(true);
    expect(shouldResumeAfterLink(false)).toBe(false);
  });

  it("always loads the catalog for a URI open even when a cache hit exists", async () => {
    let loads = 0;
    const cached = { id: "l1" };
    const found = await loadLessonForUri(
      "c1",
      "l1",
      async () => {
        loads += 1;
      },
      () => cached,
    );
    expect(loads).toBe(1);
    expect(found).toBe(cached);
  });

  it("propagates catalog load failures instead of returning a warm cache", async () => {
    await expect(
      loadLessonForUri(
        "c1",
        "l1",
        async () => {
          throw new Error("401");
        },
        () => ({ id: "cached" }),
      ),
    ).rejects.toThrow("401");
  });

  it("clears pending only after a successful open", async () => {
    const opened: PendingLesson[] = [];
    const leftover = await consumePendingOnSuccess(
      { courseId: "c1", lessonId: "l1" },
      async (pending) => {
        opened.push(pending);
      },
    );
    expect(opened).toEqual([{ courseId: "c1", lessonId: "l1" }]);
    expect(leftover).toBeUndefined();
  });

  it("keeps pending when open throws", async () => {
    await expect(
      consumePendingOnSuccess({ courseId: "c1", lessonId: "l1" }, async () => {
        throw new Error("catalog failed");
      }),
    ).rejects.toThrow("catalog failed");
  });

  it("throws when the deep-linked lesson is missing", () => {
    expect(() => requireDeepLinkedLesson(undefined)).toThrow("レッスンが見つかりません");
  });

  it("returns the lesson when the deep-link target exists", () => {
    const lesson = { id: "l1" };
    expect(requireDeepLinkedLesson(lesson)).toBe(lesson);
  });

  it("keeps pending when the deep-linked lesson is missing", async () => {
    await expect(
      consumePendingOnSuccess({ courseId: "c1", lessonId: "l1" }, async () => {
        requireDeepLinkedLesson(undefined);
      }),
    ).rejects.toThrow("レッスンが見つかりません");
  });
});
