import { describe, expect, it } from "vitest";

import type { SkillMapStageNode } from "@/lib/skill-map-api";

import { nebulaCaption } from "./nebula-caption";

describe("nebulaCaption", () => {
  it("requires が空なら割り当てで現れたと伝える", () => {
    expect(nebulaCaption("開発ラボG", [])).toBe("割り当てで現れた");
  });

  it("開発環境の名前は入口にする", () => {
    expect(nebulaCaption("AWS資格", [])).toBe("入口のクリアで現れた");
  });

  it("配信された星から前提の名前を引く", () => {
    const nodes: SkillMapStageNode[] = [
      {
        id: "python",
        slug: "python-basics",
        title: "Python 入門",
        state: "cleared",
        visibility: "full",
      },
    ];
    expect(nebulaCaption("DevOps", nodes)).toBe("Python 入門のクリアで現れた");
  });

  it("前提が未配信・名前なしなら名前を推測しない", () => {
    expect(nebulaCaption("DevOps", [])).toBe("前提のクリアで現れた");
    expect(
      nebulaCaption("DevOps", [
        { id: "python", slug: "python-basics", state: "locked", visibility: "edge" },
      ]),
    ).toBe("前提のクリアで現れた");
  });

  it("未知のキーなら null", () => {
    expect(nebulaCaption("unknown", [])).toBeNull();
  });
});
