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
  it("既定では動画だけを表示し、同じキーの字幕をオンにしてポスターを付ける", () => {
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
    expect(html).not.toContain('aria-label="教材の表示"');
    expect(html).toContain("hash.mp4");
    expect(html).toContain(
      'poster="https://materials.example/lesson-video/ses/stage/topic/hash.jpg"',
    );
    expect(html).toMatch(/<track[^>]+hash\.vtt[^>]+default=""/);
    expect(html).toMatch(/<button[^>]+aria-label="字幕を隠す"[^>]+aria-pressed="true"/);
    expect(html).not.toContain("SLIDES_CONTENT");
    expect(html).not.toContain("完了にする");
    expect(html).not.toContain("完了済み");
    expect(html).not.toContain("視聴 ");
  });
  it("管理者の確認用に切り替えを表示し、動画を選択する", () => {
    const html = renderToStaticMarkup(
      createElement(
        SlideLessonMedia,
        { lessonId: "lesson", videoPath: "video.mp4", showSlidesToggle: true },
        "SLIDES_CONTENT",
      ),
    );
    expect(html).toContain('aria-label="教材の表示"');
    expect(html).toContain('aria-pressed="true">動画');
    expect(html).toContain('aria-pressed="false">スライド');
    expect(html).not.toContain("SLIDES_CONTENT");
  });
  it("受講者のスライド動画でも手動の完了ボタンを出さない", () => {
    const html = renderToStaticMarkup(
      createElement(SlideLessonMedia, {
        lessonId: "lesson",
        videoPath: "video.mp4",
        onComplete: vi.fn(),
      }),
    );
    expect(html).not.toContain("完了にする");
    expect(html).not.toContain("完了済み");
    expect(html).not.toContain("視聴 ");
  });
  it("完了したスライド動画でも完了の帯を出さない", () => {
    const html = renderToStaticMarkup(
      createElement(SlideLessonMedia, {
        lessonId: "completed-lesson",
        videoPath: "video.mp4",
        onComplete: vi.fn(),
      }),
    );
    expect(html).not.toContain("完了済み");
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
  it("動画レッスンでは独自の操作バーを出し、字幕と進捗の帯を出さない", () => {
    const html = renderToStaticMarkup(
      createElement(VideoViewer, { lessonId: "video", videoPath: "video.mp4", totalSec: 400 }),
    );
    expect(html).not.toMatch(/<video[^>]*\scontrols(?:[\s=>])/);
    expect(html).toMatch(/<video[^>]+playsInline=""/i);
    expect(html).toContain('role="slider"');
    expect(html).toContain('aria-label="再生位置"');
    expect(html).toContain('aria-valuenow="0"');
    expect(html).toContain('aria-valuemax="400"');
    expect(html).toContain('aria-valuetext="0分0秒 / 6分40秒"');
    expect(html).toMatch(/<button[^>]+type="button"[^>]+aria-label="再生"/);
    expect(html).not.toMatch(/<button[^>]+aria-label="字幕を(?:表示|隠す)"/);
    expect(html).not.toContain("完了にする");
    expect(html).not.toContain("完了済み");
    expect(html).not.toContain("視聴 ");
  });
  it.each([
    ["lesson", false],
    ["completed-lesson", true],
  ])("レッスン %s で次へボタンを表示するかは %s", (lessonId, visible) => {
    const html = renderToStaticMarkup(
      createElement(VideoViewer, {
        lessonId,
        videoPath: "video.mp4",
        nextLessonTitle: "次の操作を試す",
        onAdvanceNext: vi.fn(),
      }),
    );
    expect(html.includes('aria-label="次の教材へ: 次の操作を試す"')).toBe(visible);
  });
});
