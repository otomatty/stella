import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseCaptionCue,
  readVideoCaptions,
  useVideoCaptions,
  videoPictureRect,
  writeVideoCaptions,
} from "@/lib/video-captions";
import { SlideLessonMedia } from "./SlideLessonMedia";
import { reachesVideoCompletion, seekDismissesNextOverlay, VideoViewer } from "./VideoViewer";

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
vi.mock("@/lib/video-captions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/video-captions")>();
  return { ...actual, useVideoCaptions: vi.fn(actual.useVideoCaptions) };
});

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

describe("シーク後に次の教材の案内を閉じる判定", () => {
  it.each([
    [98.99, 100, true],
    [99, 100, false],
    [100, 100, false],
    [30, Number.NaN, false],
    [30, Number.POSITIVE_INFINITY, false],
  ])("再生位置 %s 秒、長さ %s 秒では案内を閉じるか (%s)", (time, duration, expected) => {
    expect(seekDismissesNextOverlay(time, duration)).toBe(expected);
  });
});

describe("スライドの動画表示", () => {
  it("既定では動画だけを表示し、同じキーの字幕をオンにしてポスターを付ける", () => {
    vi.mocked(useVideoCaptions).mockReturnValueOnce({
      available: true,
      cues: [],
      picture: null,
    });
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
  it("コメントの印をシークバーの外に描画し、近い印はまとめる", () => {
    const html = renderToStaticMarkup(
      createElement(VideoViewer, {
        lessonId: "video",
        videoPath: "video.mp4",
        totalSec: 100,
        markers: [
          {
            id: "a",
            position_sec: 48,
            resolved: false,
            author_name: "受講者",
            excerpt: "質問です",
          },
          { id: "b", position_sec: 75, resolved: true, author_name: "管理者", excerpt: "補足です" },
          {
            id: "c",
            position_sec: 77,
            resolved: true,
            author_name: "受講者",
            excerpt: "解決しました",
          },
        ],
      }),
    );
    expect(html).toMatch(/<button[^>]+type="button"[^>]+aria-label="0:48 のコメント 1件"/);
    expect(html).toMatch(/<button[^>]+type="button"[^>]+aria-label="1:15 のコメント 2件"/);
    expect(html).not.toContain('aria-label="1:17 のコメント');
    expect(html).toMatch(
      /<div role="slider".*?<\/div><\/div><\/div><div[^>]*><button[^>]+aria-label="0:48 のコメント 1件"/,
    );
    expect(html).toContain("質問です");
    expect(html).toContain("ほか 1 件");
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

describe("動画の字幕", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["掛け算を学びます。", "掛け算を学びます。", false],
    ["<c.on-dark>アスタリスク</c>", "アスタリスク", true],
    ["<b><c.note.on-dark><custom>用語</custom></c></b>", "用語", true],
    ["<c.on-darkest>本文</c>", "本文", false],
    ["&lt;c.on-dark&gt; &amp; &amp;lt;", "<c.on-dark> & &lt;", false],
    [" <b> </b>\n", "", false],
  ])("cue %j の文と暗い画面の印を取り出す", (raw, text, onDark) => {
    expect(parseCaptionCue(raw)).toEqual({ text, onDark });
  });

  it.each([
    [1000, 360, { left: 180, top: 0, width: 640, height: 360 }],
    [640, 600, { left: 0, top: 120, width: 640, height: 360 }],
    [640, 360, { left: 0, top: 0, width: 640, height: 360 }],
  ])("幅 %s、高さ %s の枠に収まる映像の位置と大きさを求める", (width, height, picture) => {
    expect(videoPictureRect(width, height, 1920, 1080)).toEqual(picture);
  });

  const renderVideo = () =>
    renderToStaticMarkup(
      createElement(VideoViewer, {
        lessonId: "video",
        videoPath: "video.mp4",
        captionsPath: "captions.vtt",
      }),
    );

  const mockCue = (onDark: boolean) => {
    vi.mocked(useVideoCaptions).mockReturnValueOnce({
      available: true,
      cues: [{ text: "字幕の文 <例>", onDark, key: "cue" }],
      picture: { left: 180, top: 0, width: 640, height: 360 },
    });
  };

  it.each([
    [false, "video-caption"],
    [true, "video-caption-on-dark"],
  ])("暗い画面の印が %s の字幕に %s を適用する", (onDark, className) => {
    mockCue(onDark);
    const html = renderVideo();
    expect(html).toMatch(/<div class="pointer-events-none absolute" aria-hidden="true"/);
    expect(html).toContain(`<span class="${className}">字幕の文 &lt;例&gt;</span>`);
    expect(html).toContain("font-size:12.48px");
  });

  it("字幕を非表示にすると文を表示せず、表示に戻すボタンを出す", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => "0" } });
    mockCue(true);
    const html = renderVideo();
    expect(html).not.toContain("字幕の文");
    expect(html).toMatch(/<button[^>]+aria-label="字幕を表示"[^>]+aria-pressed="false"/);
  });

  it("cue が無ければトラックを出力し、字幕ボタンは出さない", () => {
    const html = renderVideo();
    expect(html).toMatch(/<track[^>]+kind="captions"[^>]+captions\.vtt[^>]+default=""/);
    expect(html).not.toMatch(/<button[^>]+aria-label="字幕を(?:表示|隠す)"/);
  });

  it("字幕は既定で表示し、切り替えた設定を保存して読み直せる", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: { getItem: storage.get.bind(storage), setItem: storage.set.bind(storage) },
    });
    expect(readVideoCaptions()).toBe(true);
    writeVideoCaptions(false);
    expect(storage.get("lms_video_captions_v1")).toBe("0");
    expect(readVideoCaptions()).toBe(false);
    writeVideoCaptions(true);
    expect(storage.get("lms_video_captions_v1")).toBe("1");
    expect(readVideoCaptions()).toBe(true);
  });

  it("localStorage へのアクセスが拒否されても表示を続ける", () => {
    vi.stubGlobal("window", {
      get localStorage() {
        throw new Error("ストレージへのアクセスが拒否されました");
      },
    });
    expect(readVideoCaptions()).toBe(true);
    expect(() => writeVideoCaptions(false)).not.toThrow();
    mockCue(false);
    expect(renderVideo()).toContain("字幕の文");
  });
});
