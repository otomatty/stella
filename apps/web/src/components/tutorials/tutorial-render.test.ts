import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Tutorial } from "@/lib/tutorials";
import { TutorialPlayer, TutorialEmbed } from "./TutorialPlayer";
import { TutorialCard, OverviewTutorialButton } from "./TutorialCard";
import { LessonMarkdown } from "@/components/learner/MarkdownSlides";

const state = vi.hoisted(() => ({ list: [] as Tutorial[] }));
vi.mock("@/lib/tutorials", async (original) => ({
  ...(await original<typeof import("@/lib/tutorials")>()),
  useTutorials: () => state.list,
}));
const tutorial: Tutorial = {
  id: "overview",
  title: "学ぶ流れ",
  summary: "説明",
  screen: "/",
  order: 0,
  duration: 90,
  video: "/tutorials/overview.mp4",
  poster: "/tutorials/overview.jpg",
  captions: "/tutorials/overview.vtt",
  narration: false,
  chapters: [
    { t: 0, title: "開始" },
    { t: 20, title: "次のステップ" },
  ],
  recordedAt: "2026-11-07",
  sourceHash: "hash",
};
afterEach(() => {
  state.list = [];
});
describe("tutorial rendering", () => {
  it("includes native controls, Japanese captions, speeds and chapters", () => {
    const html = renderToStaticMarkup(createElement(TutorialPlayer, { tutorial }));
    expect(html).toContain('preload="metadata"');
    expect(html).toContain('controls=""');
    expect(html).toContain('src="/tutorials/overview.vtt"');
    expect(html).toContain('srcLang="ja"');
    expect(html).toContain("音声なし (字幕で説明します)");
    for (const label of ["0.75×", "1×", "1.25×", "1.5×", "次のステップ"])
      expect(html).toContain(label);
  });
  it("renders card and first-guide entry only when overview is available", () => {
    expect(renderToStaticMarkup(createElement(OverviewTutorialButton))).toBe("");
    state.list = [tutorial];
    expect(renderToStaticMarkup(createElement(OverviewTutorialButton))).toContain(
      "STELLA で学ぶ流れを動画で見る (1:30)",
    );
    const card = renderToStaticMarkup(createElement(TutorialCard, { tutorial }));
    expect(card).toContain("▶ 再生する");
    expect(card).toContain("1:30");
  });
  it("renders missing-video placeholders without authentication context", () => {
    expect(renderToStaticMarkup(createElement(TutorialEmbed, { id: "missing" }))).toContain(
      "動画は準備中です",
    );
    const props = { children: "before\n\n:::tutorial missing\n\nafter" };
    const html = renderToStaticMarkup(createElement(LessonMarkdown, props));
    expect(html).toContain("動画は準備中です");
    expect(html.indexOf("before")).toBeLessThan(html.indexOf("動画は準備中です"));
    expect(html.indexOf("after")).toBeGreaterThan(html.indexOf("動画は準備中です"));
  });
  it("embeds a player at the specified position but preserves code examples", () => {
    state.list = [tutorial];
    const props = { children: ":::tutorial overview\n\n```md\n:::tutorial overview\n```" };
    const html = renderToStaticMarkup(createElement(LessonMarkdown, props));
    expect(html.match(/<video /g)).toHaveLength(1);
    expect(html).toContain(":::tutorial overview");
  });
});
