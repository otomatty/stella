import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatDuration,
  parseTutorialManifest,
  tutorialById,
  tutorialsForRoute,
} from "./tutorials";

const row = {
  id: "overview",
  title: "学ぶ流れ",
  summary: "説明",
  screen: "/",
  order: 2,
  duration: 90,
  video: "overview.mp4",
  poster: "/tutorials/overview.jpg",
  captions: "overview.vtt",
  narration: false,
  recordedAt: "2026-11-07",
  sourceHash: "hash",
  chapters: [{ t: 0, title: "最初" }],
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe("tutorial manifests", () => {
  it("validates rows, excludes drafts, normalizes assets and sorts", () => {
    const list = parseTutorialManifest({
      tutorials: [
        row,
        null,
        { ...row, id: "draft", draft: true },
        { ...row, id: "first", order: 1 },
        { ...row, duration: "90" },
      ],
    });
    expect(list.map((t) => t.id)).toEqual(["first", "overview"]);
    expect(list[0]?.video).toBe("/tutorials/overview.mp4");
    expect(list[0]?.poster).toBe("/tutorials/overview.jpg");
    expect(list[0]?.captions).toBe("/tutorials/overview.vtt");
    expect(
      parseTutorialManifest({
        tutorials: [{ ...row, video: "/tutorials/archive/overview.mp4" }],
      })[0]?.video,
    ).toBe("/tutorials/archive/overview.mp4");
    expect(parseTutorialManifest(null)).toEqual([]);
    expect(parseTutorialManifest({ tutorials: {} })).toEqual([]);
  });
  it.each([
    "https://example.com/a.mp4",
    "//evil/a.mp4",
    "/elsewhere/a.mp4",
    "../a.mp4",
    "/tutorials/../a.mp4",
    "/tutorials/%2e%2e/a.mp4",
    "a.mp4?x",
    "a\\b.mp4",
  ])("rejects unsafe assets %s", (path) => {
    for (const key of ["video", "poster", "captions"])
      expect(parseTutorialManifest({ tutorials: [{ ...row, [key]: path }] })).toEqual([]);
  });
  it("rejects malformed chapters and optional fields", () => {
    for (const change of [
      { chapters: [{ t: -1, title: "bad" }] },
      { narration: "false" },
      { chapters: [{ t: 91, title: "bad" }] },
      { draft: "false" },
    ]) {
      expect(parseTutorialManifest({ tutorials: [{ ...row, ...change }] })).toEqual([]);
    }
  });
  it("matches route patterns literally and never returns drafts", () => {
    const list = [
      { ...row, id: "second" },
      { ...row, order: 1 },
      { ...row, id: "draft", draft: true },
      { ...row, id: "lesson", screen: "/stages/$stageId/lessons/$lessonId" },
    ];
    expect(tutorialsForRoute("/", list).map((t) => t.id)).toEqual(["overview", "second"]);
    expect(tutorialsForRoute("/stages/one/lessons/two", list)).toEqual([]);
    expect(tutorialById("draft", list)).toBeUndefined();
    expect(tutorialById("overview", list)?.id).toBe("overview");
    expect(formatDuration(119.7)).toBe("2:00");
  });
  it("loads once and caches an absent manifest as an empty list", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetcher);
    const { loadTutorials } = await import("./tutorials");
    expect(await Promise.all([loadTutorials(), loadTutorials()])).toEqual([[], []]);
    expect(await loadTutorials()).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("loads a valid manifest once", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ tutorials: [row] }) });
    vi.stubGlobal("fetch", fetcher);
    const { loadTutorials } = await import("./tutorials");
    expect((await loadTutorials())[0]?.id).toBe("overview");
    await loadTutorials();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
