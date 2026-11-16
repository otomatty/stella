import { describe, expect, it } from "vitest";
import type { GuidedStage } from "@stella/shared/stage-grants/types";
import {
  guidedStagesLoadResult,
  guidancePayload,
  guidedDeadline,
  guidedStageCard,
  guidedStageLineTitle,
} from "./guided-stages";

const stage: GuidedStage = {
  stage_id: "sample-stage",
  title: "架空の練習",
  source_name: null,
  message: null,
  due_at: null,
  status: "available",
  prerequisite_titles: [],
  progress: { unit: "problems", passed: 0, total: 1292 },
};

describe("案内の期限は日本時間の暦日で数える", () => {
  const due = "2026-12-04T14:59:59.000Z";
  it("あと n 日と月日、期限なし", () => {
    expect(guidedDeadline(due, new Date("2026-11-16T15:00:00Z"))).toMatchObject({
      days: 17,
      text: "12/4 まで・あと 17 日",
      urgent: false,
    });
    expect(guidedDeadline(null)).toBeNull();
  });
  it("日本時間の午前0時に残り日数が変わる", () => {
    expect(guidedDeadline(due, new Date("2026-12-03T14:59:59Z"))?.text).toBe(
      "12/4 まで・あと 1 日",
    );
    expect(guidedDeadline(due, new Date("2026-12-03T15:00:00Z"))).toMatchObject({
      text: "今日まで",
      urgent: true,
    });
    expect(guidedDeadline(due, new Date("2026-12-04T14:59:59Z"))?.text).toBe("今日まで");
    expect(guidedDeadline(due, new Date("2026-12-04T15:00:00Z"))).toMatchObject({
      text: "期限を過ぎています（12/4）",
      urgent: true,
    });
  });
  it("3日前から文字と強調、年の境目", () => {
    expect(guidedDeadline(due, new Date("2026-11-30T15:00:00Z"))).toMatchObject({
      short: "あと 3 日",
      urgent: true,
    });
    expect(guidedDeadline(due, new Date("2026-11-29T15:00:00Z"))?.urgent).toBe(false);
    expect(guidedDeadline("2027-01-01T14:59:59Z", new Date("2026-12-31T14:59:59Z"))?.days).toBe(1);
  });
});

describe("案内されたステージのカード", () => {
  it("開始・続き・ロックと進み具合", () => {
    expect(guidedStageCard(stage)).toMatchObject({
      button: "始める",
      progress: "0/1292 問",
      percent: 0,
      prerequisite: null,
    });
    expect(
      guidedStageCard({
        ...stage,
        status: "in-progress",
        progress: { unit: "tasks", passed: 3, total: 19 },
      }),
    ).toMatchObject({ button: "続きを開く", progress: "3/19 課題" });
    expect(
      guidedStageCard({
        ...stage,
        status: "locked",
        prerequisite_titles: ["架空の基礎", "架空の準備"],
      }),
    ).toMatchObject({
      button: null,
      prerequisite: "『架空の基礎』・『架空の準備』を終えると始められます",
    });
  });
  it("0件の棒と、前提名が無いロック", () => {
    expect(
      guidedStageCard({
        ...stage,
        status: "locked",
        progress: { unit: "tasks", passed: 0, total: 0 },
      }),
    ).toMatchObject({ percent: 0, prerequisite: "開始の条件がそろうと始められます" });
  });
});

describe("管理者の案内入力", () => {
  it("日付はその日の日本時間23:59:59で送る、空欄はnull", () => {
    expect(
      guidancePayload({
        sourceName: "架空の研修室",
        date: "2026-12-04",
        message: "練習しましょう",
      }),
    ).toEqual({
      source_name: "架空の研修室",
      due_at: "2026-12-04T14:59:59.000Z",
      message: "練習しましょう",
    });
    expect(guidancePayload({ sourceName: "  ", date: "", message: "" })).toEqual({
      source_name: null,
      due_at: null,
      message: null,
    });
  });
  it("存在しない日付、長すぎる文字を拒否する", () => {
    for (const date of ["2026-02-29", "2026-04-31", "invalid", "2026-1-1"])
      expect(() => guidancePayload({ sourceName: "", date, message: "" })).toThrow("期限");
    expect(() => guidancePayload({ sourceName: "あ".repeat(81), date: "", message: "" })).toThrow(
      "80文字",
    );
    expect(() => guidancePayload({ sourceName: "", date: "", message: "あ".repeat(501) })).toThrow(
      "500文字",
    );
    expect(
      guidancePayload({
        sourceName: "あ".repeat(80),
        date: "2028-02-29",
        message: "あ".repeat(500),
      }).due_at,
    ).toBe("2028-02-29T14:59:59.000Z");
  });
});

describe("畳んだ案内の行の名前", () => {
  it.each([
    ["架空の研修室", "架空の研修室 事前課題 第1部", "架空の研修室 事前課題 第1部"],
    ["架空の研修室", "事前課題", "架空の研修室・事前課題"],
    ["架空の研修室", "準備：架空の研修室の課題", "架空の研修室・準備：架空の研修室の課題"],
    ["架空の研修室", "架空の研修室", "架空の研修室"],
    [null, "事前課題", "事前課題"],
    ["", "事前課題", "事前課題"],
  ])("案内元 %s・名前 %s → %s", (source_name, title, expected) => {
    expect(guidedStageLineTitle({ source_name, title })).toBe(expected);
  });
});

describe("案内の読み込み結果", () => {
  it("正常な0件と旧APIの404はエラーにしない", () => {
    expect(guidedStagesLoadResult({ stages: [] })).toEqual({ stages: [], error: null });
    expect(guidedStagesLoadResult(null, 404)).toEqual({ stages: [], error: null });
  });
  it("503と通信の失敗は、0件と区別して再読み込みを案内する", () => {
    for (const status of [503, 500, 403, undefined]) {
      expect(guidedStagesLoadResult(null, status)).toEqual({
        stages: [],
        error: "案内されたステージを読み込めませんでした",
      });
    }
  });
  it("成功した結果はそのまま返し、エラーを消す", () => {
    expect(guidedStagesLoadResult({ stages: [stage] })).toEqual({ stages: [stage], error: null });
  });
});
