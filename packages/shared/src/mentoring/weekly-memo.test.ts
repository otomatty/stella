import { describe, expect, it } from "vitest";
import {
  buildFallbackMemo,
  fallbackAction,
  materialFacts,
  type MentorMemoMaterial,
  parseMentorMemoOutput,
} from "./weekly-memo.js";

function material(over: Partial<MentorMemoMaterial> = {}): MentorMemoMaterial {
  return {
    week: { start: "2026-10-05", end: "2026-10-11" },
    pace: {
      weeklyHours: 35,
      completedHours: 30,
      expectedHours: 32,
      differenceHours: -2,
      delayDays: 0,
      needsInstructor: false,
      started: true,
    },
    activity: { activeDays: 4, studyMinutes: 300, completedLessons: 6, submissions: 2 },
    passedTasks: [{ title: "はじめてのページ", kind: "basic" }],
    passedTaskCount: 1,
    skills: { counts: { supported: 1, independent: 2, retained: 0 }, changed: [] },
    stumbles: {},
    failureStreaks: [],
    support: {},
    reviews: {
      aiConfirmed: 1,
      aiEscalated: 0,
      escalationReasons: {},
      unmetCriteria: [],
      humanPass: 0,
      humanResubmit: 0,
    },
    ...over,
  };
}

const valid = {
  summary: "予定どおり進んでいます。",
  observations: ["4日学習しました"],
  suggestedAction: "watch",
  actionReason: "つまずきがありません。",
  messageDraft: "よく進めていますね。",
};

describe("parseMentorMemoOutput", () => {
  it("形の合う応答を受け取り、前後の空白を落とす", () => {
    expect(parseMentorMemoOutput(JSON.stringify({ ...valid, summary: "  要約  " }))).toMatchObject({
      summary: "要約",
      suggestedAction: "watch",
    });
  });

  it("知らない勧め・空の文・長すぎる一言・JSON でない応答は受け取らない", () => {
    expect(parseMentorMemoOutput("not json")).toBeNull();
    expect(parseMentorMemoOutput(JSON.stringify({ ...valid, suggestedAction: "call" }))).toBeNull();
    expect(parseMentorMemoOutput(JSON.stringify({ ...valid, summary: " " }))).toBeNull();
    expect(
      parseMentorMemoOutput(JSON.stringify({ ...valid, messageDraft: "あ".repeat(501) })),
    ).toBeNull();
    expect(
      parseMentorMemoOutput(JSON.stringify({ ...valid, observations: Array(9).fill("気づき") })),
    ).toBeNull();
  });
});

describe("機械的な要約", () => {
  it("差が週の時間を超えていればペースの調整を勧める", () => {
    const m = material({
      pace: {
        ...(material().pace as NonNullable<MentorMemoMaterial["pace"]>),
        needsInstructor: true,
      },
    });
    expect(fallbackAction(m)).toBe("pace");
    expect(buildFallbackMemo(m).suggestedAction).toBe("pace");
  });

  it("つまずき・人に回った提出・相談・記録のない週は声掛けを勧める", () => {
    expect(fallbackAction(material({ stumbles: { idle: 1 } }))).toBe("message");
    expect(fallbackAction(material({ reviews: { ...material().reviews, aiEscalated: 1 } }))).toBe(
      "message",
    );
    expect(fallbackAction(material({ support: { consult: 1 } }))).toBe("message");
    expect(fallbackAction(material({ activity: { ...material().activity, activeDays: 0 } }))).toBe(
      "message",
    );
    expect(fallbackAction(material())).toBe("watch");
  });

  it("数字だけで書き、名前やレビューの所見を一言の案に入れない", () => {
    const memo = buildFallbackMemo(
      material({
        stumbles: { "review-escalations": 1 },
        reviews: {
          ...material().reviews,
          aiEscalated: 2,
          escalationReasons: { "rubric-unmet": 2 },
          unmetCriteria: [{ criterion: "関数名が戻り値の意味を表している", count: 2 }],
        },
      }),
    );
    expect(memo.summary).toContain("目安より2時間遅れています");
    expect(memo.summary).toContain("つまずきの知らせが1件");
    expect(memo.messageDraft).not.toContain("関数名");
    expect(memo.messageDraft).not.toContain("満たさない");
    expect(memo.observations.length).toBeLessThanOrEqual(6);
  });

  it("材料の事実に、予定との差・支援・レビューの理由を書く", () => {
    const facts = materialFacts(
      material({
        support: { "ai-chat": 3, consult: 1 },
        failureStreaks: [{ title: "フォーム", streak: 5 }],
        reviews: {
          ...material().reviews,
          aiEscalated: 1,
          escalationReasons: { "low-confidence": 1 },
        },
      }),
    );
    expect(facts.join("\n")).toContain("目安との差 −2時間");
    expect(facts.join("\n")).toContain("AI チャット 3 · 講師への相談 1");
    expect(facts.join("\n")).toContain("「フォーム」5回");
    expect(facts.join("\n")).toContain("確信度がしきい値に届かない 1");
  });

  it("未開始の受講者の要約は、未計算ではなく未開始と書く (材料の事実と食い違わない)", () => {
    const pace = material().pace as NonNullable<MentorMemoMaterial["pace"]>;
    const m = material({ pace: { ...pace, started: false } });
    expect(buildFallbackMemo(m).summary).toContain("まだ学習を始めていません");
    expect(buildFallbackMemo(m).summary).not.toContain("計算されていません");
    expect(materialFacts(m)[0]).toContain("未開始");
  });

  it("ペースが計算できない・未開始でも書ける", () => {
    expect(materialFacts(material({ pace: null }))[0]).toBe("学習ペース: 計算できませんでした");
    expect(buildFallbackMemo(material({ pace: null })).summary).toContain("まだ計算されていません");
  });
});
