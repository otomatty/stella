import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SlideLessonMedia } from "./SlideLessonMedia";
import { reachesVideoCompletion, VideoViewer } from "./VideoViewer";

vi.mock("@/lib/backend", () => ({ isBackendConfigured: () => true }));
vi.mock("@/lib/storage", () => ({
  getMaterialUrl: (key: string) => `https://materials.example/${key}`,
}));
vi.mock("@/hooks/useLessonProgress", () => ({
  useLessonProgress: (lessonId: string) => ({
    entry: lessonId === "completed-lesson" ? { completed: true, watchedSec: 120 } : undefined,
    recordWatchTime: vi.fn(),
    markComplete: vi.fn(),
  }),
  useProgressReady: () => true,
}));
vi.mock("@/lib/autoplay-pref", () => ({ useAutoplayNext: () => [false, vi.fn()] }));

describe("スライド動画の完了判定", () => {
  it.each([
    [89, 100, false],
    [90, 100, true],
    [91, 100, true],
    [90, 0, false],
    [90, Number.NaN, false],
    [90, Number.POSITIVE_INFINITY, false],
  ])("再生位置 %s 秒、長さ %s 秒の完了判定は %s", (currentTime, duration, expected) => {
    expect(reachesVideoCompletion(currentTime, duration)).toBe(expected);
  });
});

describe("スライドの動画表示", () => {
  it("動画を既定で表示し、同じキーの字幕をオンにしてポスターを付ける", () => {
    const html = renderToStaticMarkup(
      createElement(
        SlideLessonMedia,
        {
          lessonId: "lesson",
          videoPath: "lesson-video/ses/stage/topic/hash.mp4",
        },
        "SLIDES_CONTENT",
      ),
    );
    expect(html).toContain('aria-label="教材の表示"');
    expect(html).toContain('aria-pressed="true">動画');
    expect(html).toContain("hash.mp4");
    expect(html).toContain(
      'poster="https://materials.example/lesson-video/ses/stage/topic/hash.jpg"',
    );
    expect(html).toMatch(/<track[^>]+hash\.vtt[^>]+default=""/);
    expect(html).not.toContain("SLIDES_CONTENT");
    expect(html).not.toContain("完了にする");
    expect(html).not.toContain("完了済み");
    expect(html).not.toContain("視聴 ");
  });
  it("受講者のスライド動画では完了ボタンを出す", () => {
    const html = renderToStaticMarkup(
      createElement(SlideLessonMedia, {
        lessonId: "lesson",
        videoPath: "video.mp4",
        onComplete: vi.fn(),
      }),
    );
    expect(html).toContain("完了にする");
    expect(html).not.toContain("視聴 ");
  });
  it("完了したスライド動画では完了済みと表示する", () => {
    const html = renderToStaticMarkup(
      createElement(SlideLessonMedia, {
        lessonId: "completed-lesson",
        videoPath: "video.mp4",
        onComplete: vi.fn(),
      }),
    );
    expect(html).toContain("完了済み");
    expect(html).not.toContain("完了にする");
    expect(html).not.toContain("視聴 ");
  });
  it("動画なしは切り替えを出さずスライドだけを表示する", () => {
    expect(
      renderToStaticMarkup(
        createElement(
          SlideLessonMedia,
          {
            lessonId: "lesson",
          },
          "SLIDES_CONTENT",
        ),
      ),
    ).toBe("SLIDES_CONTENT");
  });
  it("既存の動画レッスンは進捗と完了操作を引き続き出す", () => {
    const html = renderToStaticMarkup(
      createElement(VideoViewer, { lessonId: "video", videoPath: "video.mp4" }),
    );
    expect(html).toContain("完了にする");
    expect(html).toContain("視聴 ");
  });
});
