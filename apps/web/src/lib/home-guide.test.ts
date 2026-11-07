import { describe, expect, it } from "vitest";

import type { SkillMapStageNode } from "@/lib/skill-map-api";

import { buildHomeGuide, startableStageIds } from "./home-guide";
import { buildTodayPlan } from "./today-plan";

const node = (id: string, over: Partial<SkillMapStageNode> = {}): SkillMapStageNode => ({
  id,
  state: "unlocked",
  visibility: "full",
  title: `ステージ ${id}`,
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
  startableStageIds: [] as string[],
  stageAudienceById: {} as Record<string, SkillMapStageNode["audience"]>,
  reviewDone: false,
};

describe("startableStageIds", () => {
  it("サーバの順を保ち、解放済みで名前の見える星だけを返す", () => {
    const nodes = [
      node("a"),
      node("b", { state: "locked" }),
      node("c", { visibility: "fog", title: undefined }),
      node("d", { state: "cleared" }),
      node("e"),
    ];
    expect(startableStageIds(nodes, ["e", "b", "c", "d", "a"], null)).toEqual(["e", "a"]);
  });

  it("進行中の星と、応答に無い星は返さない", () => {
    const nodes = [node("a"), node("b")];
    expect(startableStageIds(nodes, ["a", "x", "b"], "a")).toEqual(["b"]);
  });

  it("上限なしで全部返し、重複は 1 つにする", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `s${i}`);
    const nodes = ids.map((id) => node(id));
    expect(startableStageIds(nodes, ["s0", ...ids], null)).toEqual(ids);
  });
});

describe("buildHomeGuide", () => {
  it("今日のプランの順をそのまま手順にする (先頭が「次にやること」)", () => {
    const guide = buildHomeGuide({
      ...base,
      plan: buildTodayPlan({ srsDueCount: 6, activeStage: ACTIVE }),
      startableStageIds: ["x"],
    });
    expect(guide.steps.map((s) => (s.kind === "plan" ? s.item.kind : s.kind))).toEqual([
      "review",
      "lesson",
    ]);
  });

  it("続きのレッスンがあるうちは、ステージの一覧を出さない (1 つに絞る)", () => {
    const guide = buildHomeGuide({
      ...base,
      plan: buildTodayPlan({ srsDueCount: 0, activeStage: ACTIVE }),
      startableStageIds: ["x", "y"],
    });
    expect(guide.steps.some((s) => s.kind === "choose")).toBe(false);
  });

  it("受講 0 件で Basic が 1 つだけなら、その星を始める案内が最初の一手になる", () => {
    const guide = buildHomeGuide({
      ...base,
      hasEnrollment: false,
      startableStageIds: ["root"],
    });
    expect(guide.steps).toEqual([{ kind: "first-stage", stageId: "root" }]);
  });

  it("受講 0 件でも Basic と Extra が 1 つずつなら、ツリーから選ぶ", () => {
    const guide = buildHomeGuide({
      ...base,
      hasEnrollment: false,
      startableStageIds: ["root", "extra"],
      stageAudienceById: { root: undefined, extra: "granted" },
    });
    expect(guide.steps).toEqual([{ kind: "choose", welcome: true, stageIds: ["root", "extra"] }]);
  });

  it("受講 0 件でも Basic が 2 つなら、ツリーから選ぶ", () => {
    const guide = buildHomeGuide({
      ...base,
      hasEnrollment: false,
      startableStageIds: ["root", "other"],
      stageAudienceById: { root: undefined, other: undefined },
    });
    expect(guide.steps).toEqual([{ kind: "choose", welcome: true, stageIds: ["root", "other"] }]);
  });

  it("受講 0 件でも Extra だけなら、ツリーから選ぶ", () => {
    const guide = buildHomeGuide({
      ...base,
      hasEnrollment: false,
      startableStageIds: ["extra"],
      stageAudienceById: { extra: "granted" },
    });
    expect(guide.steps).toEqual([{ kind: "choose", welcome: true, stageIds: ["extra"] }]);
  });

  it("受講があれば Basic が 1 つだけでも初回の案内は出さない", () => {
    const guide = buildHomeGuide({ ...base, startableStageIds: ["root"] });
    expect(guide.steps).toEqual([{ kind: "choose", welcome: false, stageIds: ["root"] }]);
  });

  it("受講 0 件で復習があるときも、最初のステージを始める案内を先にする", () => {
    const plan = buildTodayPlan({ srsDueCount: 3 });
    const guide = buildHomeGuide({
      ...base,
      hasEnrollment: false,
      plan,
      startableStageIds: ["root"],
    });
    expect(guide.steps).toEqual([
      { kind: "first-stage", stageId: "root" },
      ...plan.items.map((item) => ({ kind: "plan", item })),
    ]);
  });

  it("レッスンが尽きた進行中のステージは、仕上げを確かめてから次の星へ", () => {
    const guide = buildHomeGuide({
      ...base,
      activeWithoutLesson: true,
      startableStageIds: ["next"],
    });
    expect(guide.steps).toEqual([
      { kind: "wrapup" },
      { kind: "choose", welcome: false, stageIds: ["next"] },
    ]);
  });

  it("復習だけが残っている日も、ステージの一覧は後ろに続く", () => {
    const guide = buildHomeGuide({
      ...base,
      plan: buildTodayPlan({ srsDueCount: 3 }),
      startableStageIds: ["next"],
    });
    expect(guide.steps.map((s) => s.kind)).toEqual(["plan", "choose"]);
  });

  it("何も無い日は空の手順と、言い分けだけを返す", () => {
    expect(buildHomeGuide(base)).toEqual({ steps: [], idle: "empty" });
    expect(buildHomeGuide({ ...base, reviewDone: true })).toEqual({ steps: [], idle: "done" });
  });
});
