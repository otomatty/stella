import { describe, expect, it } from "vitest";
import type { SkillMapMine, SkillMapStageNode } from "./skill-map-api";
import { buildHomeGuide, homeGuideStageInput } from "./home-guide";
import { buildTodayPlan } from "./today-plan";

const nodes: SkillMapStageNode[] = [
  { id: "basic", title: "架空の最初の研修", state: "unlocked", visibility: "full" },
  {
    id: "guided",
    title: "架空の事前課題",
    audience: "granted",
    state: "unlocked",
    visibility: "full",
  },
];
const map: SkillMapMine = {
  stages: nodes,
  next_stage_ids: ["basic", "guided"],
  unguided_next_stage_ids: ["basic"],
  has_enrollment: false,
  has_unguided_enrollment: false,
  active_stage_id: null,
  active_stage_source: "derived",
  cleared_count: 0,
  generated_at: "",
  focus_bonus: { streak_days: 0, multiplier: 1, next_tier_days: null, next_multiplier: null },
};
const input = {
  plan: buildTodayPlan({ srsDueCount: 0 }),
  activeWithoutLesson: false,
  reviewDone: false,
  stageAudienceById: { guided: "granted" as const },
};

describe("案内の枠が割り当てを受け持つので通常のガイドから分ける", () => {
  it.each([false, true])(
    "案内されたステージの受講登録 %s でも最初の研修を名指しする",
    (enrolled) => {
      const ordinary = homeGuideStageInput({ ...map, has_enrollment: enrolled }, nodes);
      expect(buildHomeGuide({ ...input, ...ordinary }).steps).toEqual([
        { kind: "first-stage", stageId: "basic" },
      ]);
    },
  );
  it("自分で案内されたステージをフォーカスにしたらその続きを出す", () => {
    const plan = buildTodayPlan({
      srsDueCount: 0,
      activeStage: {
        stageTitle: "架空の事前課題",
        nextLessonTitle: "架空の導入",
        remainingLessons: 1,
      },
    });
    expect(
      buildHomeGuide({
        ...input,
        ...homeGuideStageInput(
          { ...map, active_stage_id: "guided", active_stage_source: "chosen" },
          nodes,
        ),
        plan,
      }).steps,
    ).toEqual(plan.items.map((item) => ({ kind: "plan", item })));
  });
  it("割り当てが無い人は従来どおり最初の研修を名指しする", () => {
    const basicNodes = nodes.slice(0, 1);
    expect(
      buildHomeGuide({
        ...input,
        ...homeGuideStageInput(
          { ...map, stages: basicNodes, next_stage_ids: ["basic"] },
          basicNodes,
        ),
      }).steps,
    ).toEqual([{ kind: "first-stage", stageId: "basic" }]);
  });
  it.each([false, true])(
    "割り当てのない受講者の登録 %s では新旧APIで同じガイドになる",
    (enrolled) => {
      const basicNodes = [nodes[0]];
      const { unguided_next_stage_ids: _next, has_unguided_enrollment: _enrolled, ...old } = map;
      const legacy = {
        ...old,
        stages: basicNodes,
        has_enrollment: enrolled,
        next_stage_ids: ["basic"],
      };
      const current = {
        ...legacy,
        unguided_next_stage_ids: ["basic"],
        has_unguided_enrollment: enrolled,
      };
      expect(buildHomeGuide({ ...input, ...homeGuideStageInput(current, basicNodes) })).toEqual(
        buildHomeGuide({ ...input, ...homeGuideStageInput(legacy, basicNodes) }),
      );
    },
  );
  it("本人が選んだ案内ステージの仕上げを、初回の名指しより先に出す", () => {
    const ordinary = homeGuideStageInput(
      { ...map, active_stage_id: "guided", active_stage_source: "chosen" },
      nodes,
    );
    expect(buildHomeGuide({ ...input, ...ordinary, activeWithoutLesson: true }).steps).toEqual([
      { kind: "wrapup" },
      { kind: "choose", welcome: false, stageIds: ["basic"] },
    ]);
  });
  it("古いAPIは従来のExtraと受講登録を使う", () => {
    const { unguided_next_stage_ids: _next, has_unguided_enrollment: _enrolled, ...old } = map;
    expect(homeGuideStageInput(old, nodes)).toEqual({
      hasEnrollment: false,
      hasVisibleExtra: true,
      startableStageIds: ["basic", "guided"],
    });
    expect(homeGuideStageInput({ ...old, has_enrollment: true }, nodes).hasEnrollment).toBe(true);
  });
});
