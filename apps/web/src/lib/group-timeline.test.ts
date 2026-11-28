import type { GroupTimelineEvent } from "@stella/shared/groups/types";
import { describe, expect, it } from "vitest";
import { groupTimelineByDate, timelineDateHeading, timelineEventText } from "./group-timeline";

const event: GroupTimelineEvent = {
  key: "event",
  kind: "task_pass",
  date: "2026-11-28",
  member: { name: "ひかり", isMe: false },
  stage: { id: "stage", title: "HTML の基礎" },
  task: { id: "task", title: "見出しを作る" },
  reflection: null,
  reactions: [],
};

describe("timelineEventText", () => {
  it.each([
    ["stage_start", "ひかりさんが「HTML の基礎」を始めました"],
    ["task_pass", "ひかりさんが「HTML の基礎」の課題「見出しを作る」に合格しました"],
    ["stage_clear", "ひかりさんが「HTML の基礎」を修了しました 🎉"],
    ["ahead", "ひかりさんが先に進んでいます"],
  ] as const)("%s の節目を表示する", (kind, expected) => {
    expect(timelineEventText({ ...event, kind })).toBe(expected);
  });

  it("本人の行では「さん」のあとに「(あなた)」を入れる", () => {
    expect(
      timelineEventText({ ...event, kind: "stage_start", member: { name: "すばる", isMe: true } }),
    ).toBe("すばるさん (あなた) が「HTML の基礎」を始めました");
  });
});

describe("timelineDateHeading", () => {
  const now = new Date("2026-12-31T15:00:00Z");

  it.each([
    ["2027-01-01", "今日"],
    ["2026-12-31", "昨日"],
    ["2026-11-08", "11月8日"],
  ])("日本時間の日付 %s を表示する", (date, label) => {
    expect(timelineDateHeading(date, now)).toBe(label);
  });
});

it("日付は降順にし、同じ日では API の並びを保つ", () => {
  const older = { ...event, key: "older", date: "2026-11-27" };
  const next = { ...event, key: "next" };
  expect(groupTimelineByDate([event, older, next])).toEqual([
    [event.date, [event, next]],
    [older.date, [older]],
  ]);
});
