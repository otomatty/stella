import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Tutorial } from "@/lib/tutorials";
import { HelpVideoButton } from "./HelpVideoButton";

const state = vi.hoisted(() => ({ pathname: "", list: [] as Tutorial[] }));
vi.mock("@/lib/tutorials", async (original) => ({
  ...(await original<typeof import("@/lib/tutorials")>()),
  useTutorials: () => state.list,
}));
vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => state.pathname,
}));

const tutorial: Tutorial = {
  id: "stage",
  title: "ステージの使い方",
  summary: "ステージの説明",
  screen: "/stages/$stageId",
  order: 0,
  duration: 90,
  video: "/tutorials/stage.mp4",
  poster: "/tutorials/stage.jpg",
  captions: "/tutorials/stage.vtt",
  narration: false,
  chapters: [],
  recordedAt: "2026-11-07",
  sourceHash: "hash",
};

beforeEach(() => {
  state.pathname = "/stages/typescript-basics";
  state.list = [tutorial];
});

describe("HelpVideoButton", () => {
  it("renders a video help button for learners on a matching screen", () => {
    const html = renderToStaticMarkup(createElement(HelpVideoButton, { role: "learner" }));
    expect(html).toContain("<button");
    expect(html).toContain('aria-label="この画面の使い方 (動画)"');
  });

  it("renders nothing on a screen without videos", () => {
    state.pathname = "/certificates";
    expect(renderToStaticMarkup(createElement(HelpVideoButton, { role: "learner" }))).toBe("");
  });

  it("renders nothing while the tutorial list is empty", () => {
    state.list = [];
    expect(renderToStaticMarkup(createElement(HelpVideoButton, { role: "learner" }))).toBe("");
  });

  it("renders nothing for admins on a matching screen", () => {
    expect(renderToStaticMarkup(createElement(HelpVideoButton, { role: "admin" }))).toBe("");
  });
});
