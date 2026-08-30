import { describe, expect, it } from "vitest";

import type { SkillMapStageNode } from "@/lib/skill-map-api";

import { describeStar, labelOf } from "./star-detail";

const node = (over: Partial<SkillMapStageNode> = {}): SkillMapStageNode => ({
  id: "s1",
  state: "unlocked",
  visibility: "full",
  title: "SQL 入門",
  ...over,
});

const describe1 = (
  over: Partial<SkillMapStageNode> = {},
  opts: { isActive?: boolean; queued?: boolean; revealDev?: boolean } = {},
) =>
  describeStar({
    node: node(over),
    isActive: opts.isActive ?? false,
    queued: opts.queued ?? false,
    revealDev: opts.revealDev ?? false,
  });

describe("labelOf", () => {
  it("タイトル → テーマ名 → 伏せ字 の順に落ちる", () => {
    expect(labelOf(node())).toBe("SQL 入門");
    expect(labelOf(node({ title: undefined, theme: "サーバーとデータの基盤" }))).toBe(
      "サーバーとデータの基盤",
    );
    expect(labelOf(node({ title: undefined, theme: undefined }))).toBe("？？？");
  });
});

describe("describeStar の状態語", () => {
  it("霧の星は「まだ見えない」、開発者モードでは開発者表示に変わる", () => {
    expect(describe1({ visibility: "fog", state: "locked" }).stateText).toBe("まだ見えない");
    expect(describe1({ visibility: "fog", state: "locked" }, { revealDev: true }).stateText).toBe(
      "まだ先（開発者表示）",
    );
  });

  it("クリア / 進行中 / 未解放 / 解放済みを言い分ける", () => {
    expect(describe1({ state: "cleared" }).stateText).toBe("クリア済み");
    expect(describe1({}, { isActive: true }).stateText).toBe("進行中");
    expect(describe1({ state: "locked" }).stateText).toBe("未解放");
    expect(describe1({}).stateText).toBe("解放済み");
  });

  it("ぼかしは霧の星だけ (開発者モードでは外れる)", () => {
    expect(describe1({ visibility: "fog" }).obscured).toBe(true);
    expect(describe1({ visibility: "fog" }, { revealDev: true }).obscured).toBe(false);
    expect(describe1({}).obscured).toBe(false);
  });
});

describe("describeStar の本文", () => {
  it("霧の星は中身を語らない (can_do があっても予告だけ)", () => {
    expect(describe1({ visibility: "fog", can_do: "SQL が書ける" }).body).toEqual({ kind: "fog" });
  });

  it("ロック星には解放条件だけを出す", () => {
    expect(describe1({ state: "locked", lock_reasons: ["ITのきほん", "Git 入門"] }).body).toEqual({
      kind: "lock",
      text: "ITのきほん / Git 入門 をクリアすると開きます",
    });
  });

  it("解放条件の名前が無ければ一般文に落ちる", () => {
    expect(describe1({ state: "locked" }).body).toEqual({
      kind: "lock",
      text: "前提のステージをクリアすると開きます",
    });
  });

  it("解放済みは到達説明、無ければ本文なし", () => {
    expect(describe1({ can_do: "SQL が書ける" }).body).toEqual({
      kind: "can-do",
      text: "SQL が書ける",
    });
    expect(describe1({}).body).toEqual({ kind: "none" });
  });
});

describe("describeStar のボタン", () => {
  it("霧の星には何も出さない", () => {
    expect(describe1({ visibility: "fog", enrolled: true }).actions).toEqual({
      skillCheck: "none",
      start: false,
      queue: false,
      clearedNote: false,
    });
  });

  it("ロック星は飛び級の腕試しだけ", () => {
    expect(describe1({ state: "locked", enrolled: true }).actions).toEqual({
      skillCheck: "challenge",
      start: false,
      queue: false,
      clearedNote: false,
    });
  });

  it("解放済みは腕試し + 着手。キューは受講登録がある星だけ", () => {
    expect(describe1({ enrolled: true }).actions).toEqual({
      skillCheck: "try",
      start: true,
      queue: true,
      clearedNote: false,
    });
    expect(describe1({ enrolled: false }).actions.queue).toBe(false);
    expect(describe1({ enrolled: true }, { queued: true }).actions.queue).toBe(false);
  });

  it("進行中・修了済みには着手の導線を出さない", () => {
    const active = describe1({ enrolled: true }, { isActive: true }).actions;
    expect(active.start).toBe(false);
    expect(active.queue).toBe(false);

    const cleared = describe1({ state: "cleared", enrolled: true }).actions;
    expect(cleared).toEqual({
      skillCheck: "try",
      start: false,
      queue: false,
      clearedNote: true,
    });
  });
});
