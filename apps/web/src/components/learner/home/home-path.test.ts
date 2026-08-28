import { describe, expect, it } from "vitest";

import type { SkillMapStageNode } from "@/lib/skill-map-api";

import { HOME_PATH_MAX_NEXT, ancestorIdsOf, homePathNodes } from "./home-path";

const node = (over: Partial<SkillMapStageNode> & { id: string }): SkillMapStageNode => ({
  state: "locked",
  visibility: "full",
  ...over,
});

/** 入口 1 + 入門 3 (全部が入口の子) + その先 1。 */
function catalog(): SkillMapStageNode[] {
  return [
    node({ id: "it", title: "ITのきほん", state: "unlocked", prerequisite_ids: [] }),
    node({ id: "ts", title: "TypeScript", state: "locked", prerequisite_ids: ["it"] }),
    node({ id: "sql", title: "SQL", state: "locked", prerequisite_ids: ["it"] }),
    node({ id: "html", title: "HTML/CSS", state: "locked", prerequisite_ids: ["it"] }),
    node({
      id: "css",
      title: "モダンCSS",
      state: "locked",
      prerequisite_ids: ["html"],
    }),
    node({ id: "fog", state: "locked", visibility: "fog", theme: "先の分野" }),
  ];
}

function idsOf(nodes: SkillMapStageNode[]): string[] {
  return nodes.map((n) => n.id).sort();
}

describe("ancestorIdsOf", () => {
  it("子から入口まで辿る", () => {
    expect(ancestorIdsOf("css", catalog()).sort()).toEqual(["html", "it"]);
  });

  it("入口は空", () => {
    expect(ancestorIdsOf("it", catalog())).toEqual([]);
  });
});

describe("homePathNodes", () => {
  it("何も始めていないときは入口だけ (推奨の先頭)", () => {
    const shown = homePathNodes(catalog(), {
      activeStageId: null,
      nextStageIds: ["it"],
    });
    expect(idsOf(shown)).toEqual(["it"]);
  });

  it("霧の星は載せない", () => {
    const shown = homePathNodes(catalog(), {
      activeStageId: null,
      nextStageIds: ["it"],
    });
    expect(shown.some((n) => n.visibility === "fog")).toBe(false);
  });

  it("入口クリア直後、入門が全部開いても推奨の上限だけ + 入口", () => {
    const opened = catalog().map((n) =>
      n.id === "it"
        ? { ...n, state: "cleared" as const }
        : n.id === "fog"
          ? n
          : { ...n, state: "unlocked" as const },
    );
    const shown = homePathNodes(opened, {
      activeStageId: null,
      nextStageIds: ["html", "sql", "ts", "css"],
    });
    expect(shown).toHaveLength(HOME_PATH_MAX_NEXT + 1);
    expect(idsOf(shown)).toEqual(["html", "it", "sql", "ts"]);
  });

  it("進行中の講座があるとき、兄弟の入門は載せない", () => {
    const inProgress = catalog().map((n) => {
      if (n.id === "it") return { ...n, state: "cleared" as const };
      if (n.id === "ts") return { ...n, state: "active" as const, enrolled: true };
      if (n.id === "sql" || n.id === "html") return { ...n, state: "unlocked" as const };
      return n;
    });
    const shown = homePathNodes(inProgress, {
      activeStageId: "ts",
      nextStageIds: ["sql", "html"],
    });
    expect(idsOf(shown)).toEqual(["it", "ts"]);
  });

  it("進行中の子は、まだ locked でも次に載せる (evaluateSkillMap と同じ状態)", () => {
    const inProgress = catalog().map((n) => {
      if (n.id === "it") return { ...n, state: "cleared" as const };
      if (n.id === "html") return { ...n, state: "active" as const, enrolled: true };
      if (n.id === "ts" || n.id === "sql") return { ...n, state: "unlocked" as const };
      return n;
    });
    const shown = homePathNodes(inProgress, {
      activeStageId: "html",
      nextStageIds: ["ts", "sql"],
    });
    expect(idsOf(shown)).toEqual(["css", "html", "it"]);
  });

  it("飛び級で開いた子も、進行中の先として載せる", () => {
    const skipped = catalog().map((n) => {
      if (n.id === "it") return { ...n, state: "cleared" as const };
      if (n.id === "html") return { ...n, state: "active" as const, enrolled: true };
      if (n.id === "css") return { ...n, state: "unlocked" as const };
      return n;
    });
    const shown = homePathNodes(skipped, {
      activeStageId: "html",
      nextStageIds: ["css", "ts"],
    });
    expect(idsOf(shown)).toEqual(["css", "html", "it"]);
  });

  it("鎖の外の発見教材の源流も載せる", () => {
    const inProgress = catalog().map((n) => {
      if (n.id === "it") return { ...n, state: "cleared" as const };
      if (n.id === "html") return { ...n, state: "cleared" as const };
      if (n.id === "ts") return { ...n, state: "active" as const, enrolled: true };
      return n;
    });
    const shown = homePathNodes(inProgress, {
      activeStageId: "ts",
      nextStageIds: [],
      extraStageIds: ["html"],
    });
    expect(idsOf(shown)).toEqual(["html", "it", "ts"]);
  });

  it("フォーカスは無いが受講中の未クリアがあれば、その鎖を載せる", () => {
    const paused = catalog().map((n) => {
      if (n.id === "it") return { ...n, state: "cleared" as const };
      if (n.id === "sql") return { ...n, state: "unlocked" as const, enrolled: true };
      if (n.id === "ts") return { ...n, state: "unlocked" as const };
      return n;
    });
    const shown = homePathNodes(paused, {
      activeStageId: null,
      nextStageIds: ["ts", "html"],
    });
    expect(idsOf(shown)).toContain("sql");
    expect(idsOf(shown)).toContain("it");
    expect(idsOf(shown)).not.toContain("fog");
  });

  it("フォーカスが無く受講中がたくさんあっても上限で切る", () => {
    const crowded = [
      ...catalog().map((n) => {
        if (n.id === "it") return { ...n, state: "cleared" as const };
        if (n.id === "fog") return n;
        return { ...n, state: "unlocked" as const, enrolled: true };
      }),
      node({
        id: "py",
        title: "Python",
        state: "unlocked",
        enrolled: true,
        prerequisite_ids: ["it"],
      }),
    ];
    const shown = homePathNodes(crowded, {
      activeStageId: null,
      nextStageIds: [],
    });
    const enrolledShown = idsOf(shown).filter((id) => id !== "it");
    expect(enrolledShown).toHaveLength(HOME_PATH_MAX_NEXT);
  });

  it("全部クリアしたらカタログ全体は載せない", () => {
    const done = catalog().map((n) => (n.id === "fog" ? n : { ...n, state: "cleared" as const }));
    const shown = homePathNodes(done, {
      activeStageId: null,
      nextStageIds: [],
    });
    expect(shown).toEqual([]);
  });
});
