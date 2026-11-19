import { describe, expect, it } from "vitest";
import type { GuidedStage } from "@stella/shared/stage-grants/types";
import type { SkillMapMine, SkillMapStageNode } from "./skill-map-api";
import { buildHomeGuide, homeGuideStageInput, pickGuidedStage } from "./home-guide";
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
  hasVisibleExtra: false,
  reviewDone: false,
  stageAudienceById: { guided: "granted" as const },
};

const chapter = (number: string, status: GuidedStage["status"]): GuidedStage => ({
  stage_id: `devlab-ts-ch${number}`,
  title: `${number}章`,
  status,
  source_name: "開発ラボG",
  due_at: null,
  message: null,
  prerequisite_titles: [],
  progress: { unit: "problems", passed: 0, total: 12 },
});

describe("案内されたステージを選ぶ", () => {
  const available = { ...chapter("00", "available"), due_at: "2026-11-20T14:59:59Z" };
  const later = { ...chapter("01", "in-progress"), due_at: "2026-12-01T14:59:59Z" };
  const sooner = { ...chapter("02", "in-progress"), due_at: "2026-11-30T14:59:59Z" };
  const tied = { ...sooner, stage_id: "tie" };
  const noDeadline = chapter("03", "in-progress");
  const locked = { ...available, status: "locked" as const };

  it("進行中を優先し、同じ状態は期限順、期限なしは最後、同じ期限はAPI順", () => {
    expect(pickGuidedStage([available, noDeadline], null)).toBe(noDeadline);
    expect(pickGuidedStage([noDeadline, later, sooner, tied], null)).toBe(sooner);
    expect(pickGuidedStage([tied, sooner], null)).toBe(tied);
    expect(pickGuidedStage([chapter("01", "available"), available], null)).toBe(available);
  });

  it("ロック中、案内なし、現在地あり、現在地の応答前は選ばない", () => {
    expect(pickGuidedStage([locked], null)).toBeUndefined();
    expect(pickGuidedStage([], null)).toBeUndefined();
    expect(pickGuidedStage([available], "dev-env-basics")).toBeUndefined();
    expect(pickGuidedStage([later], undefined)).toBeUndefined();
  });
});

describe("案内の枠が割り当てを受け持つので通常のガイドから分ける", () => {
  it("00章がロック中の開発ラボG応募者には最初にSTELLAの使い方を案内する", () => {
    const applicantNodes: SkillMapStageNode[] = [
      { id: "dev-env-basics", title: "STELLAの使い方", state: "unlocked", visibility: "full" },
      {
        id: "devlab-ts-ch00",
        title: "00章",
        audience: "granted",
        state: "locked",
        visibility: "full",
        lock_reasons: ["STELLAの使い方"],
      },
    ];
    const ordinary = homeGuideStageInput(
      {
        ...map,
        stages: applicantNodes,
        next_stage_ids: ["dev-env-basics"],
        unguided_next_stage_ids: ["dev-env-basics"],
      },
      applicantNodes,
    );
    expect(
      buildHomeGuide({
        ...input,
        stageAudienceById: { "devlab-ts-ch00": "granted" },
        guidedStage: pickGuidedStage([chapter("00", "locked")], null),
        ...ordinary,
      }).steps,
    ).toEqual([{ kind: "first-stage", stageId: "dev-env-basics" }]);
  });

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

describe("開発ラボGの応募者と研修受講者のホーム", () => {
  const training = ["html-css-basics", "js-basics"];
  const choose = { kind: "choose", welcome: false, stageIds: training };
  const continuedPlan = (stageTitle: string, nextLessonTitle: string) =>
    buildTodayPlan({
      srsDueCount: 0,
      activeStage: { stageTitle, nextLessonTitle, remainingLessons: 1 },
    });

  it.each([
    ["dev-env-basics", "STELLAの使い方", "VS Codeの準備", chapter("00", "locked")],
    [
      "html-css-basics",
      "HTML/CSS",
      "HTMLの要素",
      { ...chapter("00", "available"), title: "資格のステージ" },
    ],
  ] as const)(
    "%s の現在地がある間は、既存の続きだけを出す",
    (activeId, title, lesson, assignment) => {
      const plan = continuedPlan(title, lesson);
      expect(
        buildHomeGuide({
          ...input,
          hasEnrollment: true,
          startableStageIds: training,
          guidedStage: pickGuidedStage([assignment], activeId),
          plan,
        }).steps,
      ).toEqual([{ kind: "plan", item: plan.items[0] }]);
    },
  );

  it.each(["00", "01"])("%s章が開いたら、先頭から開始し、そのあとに研修の選択を出す", (number) => {
    const stage = chapter(number, "available");
    expect(
      buildHomeGuide({
        ...input,
        hasEnrollment: true,
        startableStageIds: training,
        guidedStage: pickGuidedStage([stage], null),
      }).steps,
    ).toEqual([{ kind: "start-guided", stage }, choose]);
  });

  it("進行中の00章にレッスンが残っていれば続き、そのあとに研修の選択を出す", () => {
    const plan = continuedPlan("00章", "事前課題の進め方");
    expect(
      buildHomeGuide({
        ...input,
        hasEnrollment: true,
        startableStageIds: training,
        guidedStage: pickGuidedStage([chapter("00", "in-progress")], null),
        plan,
      }).steps,
    ).toEqual([{ kind: "plan", item: plan.items[0] }, choose]);
  });

  it("進行中の00章に課題が残っていれば仕上げ、そのあとに研修の選択を出す", () => {
    expect(
      buildHomeGuide({
        ...input,
        hasEnrollment: true,
        startableStageIds: training,
        guidedStage: pickGuidedStage([chapter("00", "in-progress")], null),
        activeWithoutLesson: true,
      }).steps,
    ).toEqual([{ kind: "wrapup" }, choose]);
  });

  it("前提免除で00章を始められるときも、そのあとにSTELLAの使い方を残す", () => {
    const stage = chapter("00", "available");
    expect(
      buildHomeGuide({
        ...input,
        hasEnrollment: false,
        startableStageIds: ["dev-env-basics"],
        guidedStage: pickGuidedStage([stage], null),
      }).steps,
    ).toEqual([
      { kind: "start-guided", stage },
      { kind: "first-stage", stageId: "dev-env-basics" },
    ]);
  });
});
