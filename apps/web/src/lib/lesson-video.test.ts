import { describe, expect, it } from "vitest";
import type { LessonRow } from "@stella/shared/cms/types";
import { displayLessonType, isVideoLesson, nextLessonMeta } from "./lesson-video";

describe("isVideoLesson", () => {
  it.each([
    ["video", "lesson.mp4", true],
    ["video", undefined, false],
    ["slides", "lesson.mp4", true],
    ["slides", undefined, false],
    ["text", "lesson.mp4", false],
  ] as const)("%s (動画パス %s) の動画表示は %s", (type, videoPath, expected) => {
    expect(isVideoLesson({ type, videoPath })).toBe(expected);
  });

  it.each(["lesson.mp4", null])("管理者の video 行 (動画パス %s) を判定する", (video_path) => {
    const row: Pick<LessonRow, "type" | "video_path"> = { type: "video", video_path };
    expect(isVideoLesson({ type: row.type, videoPath: row.video_path })).toBe(video_path !== null);
  });
});

describe("displayLessonType", () => {
  it.each([
    ["slides", "lesson.mp4", "video"],
    ["slides", undefined, "slides"],
    ["video", "lesson.mp4", "video"],
    ["video", undefined, "video"],
    ["text", "lesson.mp4", "text"],
    ["quiz", undefined, "quiz"],
  ] as const)("%s (動画パス %s) の表示上の種類は %s", (type, videoPath, expected) => {
    expect(displayLessonType({ type, videoPath })).toBe(expected);
  });
});

describe("nextLessonMeta", () => {
  it.each([
    ["5分", "知識問題 · 5分"],
    ["", "知識問題"],
    [undefined, "知識問題"],
  ])("所要時間が %s のときは %s", (duration, expected) => {
    expect(nextLessonMeta("知識問題", duration)).toBe(expected);
  });
});
