import { describe, expect, it } from "vitest";

import type { SkillMapStageNode } from "@/lib/skill-map-api";

import { nextUnlockIds } from "./next-unlock";

const active: SkillMapStageNode = {
  id: "active",
  title: "HTML 入門",
  state: "unlocked",
  visibility: "full",
};
const locked = (id: string, over: Partial<SkillMapStageNode> = {}): SkillMapStageNode => ({
  id,
  state: "locked",
  visibility: "full",
  lock_reasons: ["HTML 入門"],
  ...over,
});

describe("nextUnlockIds", () => {
  it("進行中が無い場合は空", () => {
    expect(nextUnlockIds([active, locked("next")], null)).toEqual(new Set());
    expect(nextUnlockIds([locked("next")], active.id)).toEqual(new Set());
  });

  it("進行中がクリア済み・霧・名前なしなら空", () => {
    for (const over of [
      { state: "cleared" },
      { visibility: "fog" },
      { title: undefined },
      { title: "" },
    ] as const) {
      expect(nextUnlockIds([{ ...active, ...over }, locked("next")], active.id)).toEqual(new Set());
    }
  });

  it("理由が複数・別の星・空の場合は含めない", () => {
    const nodes = [
      active,
      locked("multiple", { lock_reasons: [active.title ?? "", "Git 入門"] }),
      locked("other", { lock_reasons: ["Git 入門"] }),
      locked("empty", { lock_reasons: [] }),
      locked("missing", { lock_reasons: undefined }),
    ];
    expect(nextUnlockIds(nodes, active.id)).toEqual(new Set());
  });

  it("full のロック星だけを含める", () => {
    expect(
      nextUnlockIds(
        [active, locked("fog", { visibility: "fog" }), locked("open", { state: "unlocked" })],
        active.id,
      ),
    ).toEqual(new Set());
  });

  it("一致する星をすべて返す", () => {
    expect(nextUnlockIds([active, locked("a"), locked("b")], active.id)).toEqual(
      new Set(["a", "b"]),
    );
  });
});
