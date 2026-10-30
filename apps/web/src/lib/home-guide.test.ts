import { describe, expect, it } from "vitest";

import type { SkillMapStageNode } from "@/lib/skill-map-api";

import { buildHomeGuide, GUIDE_MAX_SUGGESTIONS, suggestedStageIds } from "./home-guide";
import { buildTodayPlan } from "./today-plan";

const node = (id: string, over: Partial<SkillMapStageNode> = {}): SkillMapStageNode => ({
  id,
  state: "unlocked",
  visibility: "full",
  title: `講座 ${id}`,
  ...over,
});

const ACTIVE = {
  stageTitle: "JavaScript 入門",
  nextLessonTitle: "変数と型",
  remainingLessons: 5,
};

const base = {
  plan: buildTodayPlan({ srsDueCount: 0 }),
  hasEnrollment: true,
  activeWithoutLesson: false,
  suggestedStageIds: [] as string[],
  reviewDone: false,
};

describe("suggestedStageIds", () => {
  it("推奨順を保ち、解放済みで名前の見える星だけを勧める", () => {
    const nodes = [
      node("a"),
      node("b", { state: "locked" }),
      node("c", { visibility: "fog", title: undefined }),
      node("d", { state: "cleared" }),
      node("e"),
    ];
    expect(suggestedStageIds(nodes, ["e", "b", "c", "d", "a"], null)).toEqual(["e", "a"]);
  });

  it("進行中の星と、応答に無い星は勧めない", () => {
    const nodes = [node("a"), node("b")];
    expect(suggestedStageIds(nodes, ["a", "x", "b"], "a")).toEqual(["b"]);
  });

  it(`勧めるのは ${GUIDE_MAX_SUGGESTIONS} つまで (重複は 1 つに数える)`, () => {
    const nodes = ["a", "b", "c", "d", "e"].map((id) => node(id));
    expect(suggestedStageIds(nodes, ["a", "a", "b", "c", "d", "e"], null)).toEqual(["a", "b", "c"]);
  });
});

describe("buildHomeGuide", () => {
  it("今日のプランの順をそのまま手順にする (先頭が「次にやること」)", () => {
    const guide = buildHomeGuide({
      ...base,
      plan: buildTodayPlan({ srsDueCount: 6, activeStage: ACTIVE }),
      suggestedStageIds: ["x"],
    });
    expect(guide.steps.map((s) => (s.kind === "plan" ? s.item.kind : s.kind))).toEqual([
      "review",
      "lesson",
    ]);
  });

  it("続きのレッスンがあるうちは、別の星を勧めない (1 つに絞る)", () => {
    const guide = buildHomeGuide({
      ...base,
      plan: buildTodayPlan({ srsDueCount: 0, activeStage: ACTIVE }),
      suggestedStageIds: ["x", "y"],
    });
    expect(guide.steps.some((s) => s.kind === "choose")).toBe(false);
  });

  it("何も始めていない人には、星を選ぶ案内が最初の一手になる", () => {
    const guide = buildHomeGuide({
      ...base,
      hasEnrollment: false,
      suggestedStageIds: ["root"],
    });
    expect(guide.steps).toEqual([{ kind: "choose", welcome: true, stageIds: ["root"] }]);
  });

  it("レッスンが尽きた進行中のステージは、仕上げを確かめてから次の星へ", () => {
    const guide = buildHomeGuide({
      ...base,
      activeWithoutLesson: true,
      suggestedStageIds: ["next"],
    });
    expect(guide.steps).toEqual([
      { kind: "wrapup" },
      { kind: "choose", welcome: false, stageIds: ["next"] },
    ]);
  });

  it("復習だけが残っている日も、次の星の提案は後ろに続く", () => {
    const guide = buildHomeGuide({
      ...base,
      plan: buildTodayPlan({ srsDueCount: 3 }),
      suggestedStageIds: ["next"],
    });
    expect(guide.steps.map((s) => s.kind)).toEqual(["plan", "choose"]);
  });

  it("何も無い日は空の手順と、言い分けだけを返す", () => {
    expect(buildHomeGuide(base)).toEqual({ steps: [], idle: "empty" });
    expect(buildHomeGuide({ ...base, reviewDone: true })).toEqual({ steps: [], idle: "done" });
  });
});
