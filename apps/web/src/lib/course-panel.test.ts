import { describe, expect, it } from "vitest";
import { courseStageButton, courseStagesOf, courseStageStatus } from "@/lib/course-panel";
import type { SkillMapStageNode } from "@/lib/skill-map-api";

function stage(id: string, fields: Partial<SkillMapStageNode> = {}): SkillMapStageNode {
  return { id, category: "Python", visibility: "full", state: "unlocked", ...fields };
}

describe("courseStagesOf", () => {
  it("同じコースの解放済みステージだけを open に入れ、full のロックだけを予告にする", () => {
    const open = stage("open");
    const locked = stage("locked", { state: "locked" });

    expect(
      courseStagesOf(
        [
          stage("edge", { visibility: "edge" }),
          stage("other", { category: "AWS資格" }),
          open,
          stage("other-locked", { category: "AWS資格", state: "locked" }),
          locked,
          stage("fog", { visibility: "fog", state: "locked" }),
          stage("hidden", { visibility: "hidden" }),
        ],
        "Python",
      ),
    ).toEqual({ open: [open], lockedAhead: [locked], hasMoreAhead: true });
  });

  it("親をたどった深さの順に並べ、同じ深さでは API の順番を保つ", () => {
    const root = stage("root");
    const left = stage("left", { parent_id: root.id });
    const right = stage("right", { parent_id: root.id });
    const leaf = stage("leaf", { parent_id: left.id });

    expect(courseStagesOf([leaf, right, left, root], "Python").open).toEqual([
      root,
      right,
      left,
      leaf,
    ]);
  });

  it.each(["fog", "edge"] as const)("同じコースの %s だけでも続きを知らせる", (visibility) => {
    expect(courseStagesOf([stage("ahead", { visibility })], "Python")).toEqual({
      open: [],
      lockedAhead: [],
      hasMoreAhead: true,
    });
  });

  it("別のコースのロックからは続きを知らせない", () => {
    const open = stage("open");
    expect(
      courseStagesOf([open, stage("other", { category: "AWS資格", state: "locked" })], "Python"),
    ).toEqual({ open: [open], lockedAhead: [], hasMoreAhead: false });
  });

  it("見つからない親や循環する親で並び順の計算が止まらなくなることはない", () => {
    const root = stage("root", { parent_id: "missing" });
    const a = stage("a", { parent_id: "b" });
    const b = stage("b", { parent_id: "a" });

    expect(courseStagesOf([a, b, root], "Python").open).toEqual([root, a, b]);
  });
});

describe("courseStageStatus", () => {
  it("クリアを受講登録と現在地より優先する", () => {
    expect(courseStageStatus(stage("done", { state: "cleared", enrolled: true }), "done")).toBe(
      "cleared",
    );
  });

  it("受講登録があるか現在地なら受講中にする", () => {
    expect(courseStageStatus(stage("enrolled", { enrolled: true }), null)).toBe("in-progress");
    expect(courseStageStatus(stage("active", { state: "active" }), "active")).toBe("in-progress");
    expect(courseStageStatus(stage("open"), "open")).toBe("in-progress");
  });

  it("受講登録も現在地の指定もなければ始められる", () => {
    expect(courseStageStatus(stage("open"), "other")).toBe("startable");
  });
});

describe("courseStageButton", () => {
  it("現在地の受講中で課題を開けるときは課題に取り組む", () => {
    expect(courseStageButton({ status: "in-progress", isActive: true, hasOpenTask: true })).toEqual(
      { label: "課題に取り組む", kind: "open-task" },
    );
  });

  it("現在地でなければ受講中は続きから", () => {
    expect(
      courseStageButton({ status: "in-progress", isActive: false, hasOpenTask: true }),
    ).toEqual({ label: "続きから", kind: "resume" });
  });

  it("課題を開けなければ受講中は続きから", () => {
    expect(
      courseStageButton({ status: "in-progress", isActive: true, hasOpenTask: false }),
    ).toEqual({ label: "続きから", kind: "resume" });
  });

  it("クリアは現在地で課題があってもレッスン一覧", () => {
    expect(courseStageButton({ status: "cleared", isActive: true, hasOpenTask: true })).toEqual({
      label: "レッスン一覧",
      kind: "lessons",
    });
  });

  it("始められるは課題があっても始める", () => {
    expect(courseStageButton({ status: "startable", isActive: false, hasOpenTask: true })).toEqual({
      label: "始める",
      kind: "start",
    });
  });
});
