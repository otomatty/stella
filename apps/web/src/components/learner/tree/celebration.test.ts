import { describe, expect, it } from "vitest";

import type { SkillMapStageNode } from "@/lib/skill-map-api";

import { celebrationsFor, planCelebration, snapshotOf, type Snapshot } from "./celebration";

const node = (over: Partial<SkillMapStageNode> & { id: string }): SkillMapStageNode => ({
  state: "locked",
  visibility: "full",
  ...over,
});

describe("celebrationsFor", () => {
  it("初回 (前回スナップショット無し) は何も祝わない", () => {
    const nodes = [node({ id: "a", state: "unlocked" })];
    expect(celebrationsFor(null, nodes).size).toBe(0);
  });

  it("locked → unlocked を「解放」として拾う", () => {
    const prev = snapshotOf([node({ id: "a", state: "locked" })]);
    const found = celebrationsFor(prev, [node({ id: "a", state: "unlocked" })]);
    expect(found.get("a")).toBe("unlocked");
  });

  it("locked → active (割当などで直接進行中になった) も「解放」として拾う", () => {
    const prev = snapshotOf([node({ id: "a", state: "locked" })]);
    const found = celebrationsFor(prev, [node({ id: "a", state: "active" })]);
    expect(found.get("a")).toBe("unlocked");
  });

  it("前回無かった星 (教材の公開) を「出現」として拾う", () => {
    const prev = snapshotOf([node({ id: "a" })]);
    const found = celebrationsFor(prev, [node({ id: "a" }), node({ id: "b", state: "unlocked" })]);
    expect(found.get("b")).toBe("appeared");
    expect(found.has("a")).toBe(false);
  });

  it("霧が晴れて名前が見えた星を「出現」として拾う", () => {
    const prev = snapshotOf([{ id: "a", state: "locked", visibility: "fog" }]);
    const found = celebrationsFor(prev, [node({ id: "a", visibility: "full" })]);
    expect(found.get("a")).toBe("appeared");
  });

  it("霧のままの星は祝わない (名前がぼやけたままなので祝いようがない)", () => {
    const prev = snapshotOf([]);
    const found = celebrationsFor(prev, [{ id: "a", state: "locked", visibility: "fog" }]);
    expect(found.size).toBe(0);
  });

  it("線だけの段に上がっただけの星も祝わない", () => {
    const prev = snapshotOf([]);
    const found = celebrationsFor(prev, [{ id: "a", state: "locked", visibility: "edge" }]);
    expect(found.size).toBe(0);
  });

  it("unlocked → cleared (自分で進めた結果) は演出の対象にしない", () => {
    const prev = snapshotOf([node({ id: "a", state: "unlocked" })]);
    const found = celebrationsFor(prev, [node({ id: "a", state: "cleared" })]);
    expect(found.size).toBe(0);
  });

  it("状態が変わらなければ何も返さない", () => {
    const nodes = [node({ id: "a", state: "unlocked" }), node({ id: "b" })];
    expect(celebrationsFor(snapshotOf(nodes), nodes).size).toBe(0);
  });
});

describe("planCelebration", () => {
  const tree = [node({ id: "a", state: "unlocked" })];
  /** 全員ぶん「a は locked だった」= 開いたら演出が出る保存内容。 */
  const stored: Record<string, Snapshot> = {
    A: snapshotOf([node({ id: "a", state: "locked" })]),
    B: snapshotOf([node({ id: "a", state: "locked" })]),
  };
  const readPrev = (userId: string): Snapshot | null => stored[userId] ?? null;

  it("初回は差分を取り、スナップショットを保存する", () => {
    const plan = planCelebration(null, "A", tree, readPrev);
    expect(plan.celebrations?.get("a")).toBe("unlocked");
    expect(plan.snapshot).not.toBeNull();
    expect(plan.memory).toEqual({ userId: "A", serialized: JSON.stringify(snapshotOf(tree)) });
  });

  it("同じ利用者で木が変わらなければ何もしない", () => {
    const first = planCelebration(null, "A", tree, readPrev);
    const second = planCelebration(first.memory, "A", tree, readPrev);
    expect(second.celebrations).toBeNull();
    expect(second.snapshot).toBeNull();
  });

  it("利用者が変わったら、木が同じでも保存し直して差分を取り直す", () => {
    const asA = planCelebration(null, "A", tree, readPrev);
    const asB = planCelebration(asA.memory, "B", tree, readPrev);
    // A の記憶で早期 return してはいけない (B のぶんが保存されないまま A の印が残る)。
    expect(asB.snapshot).not.toBeNull();
    expect(asB.memory?.userId).toBe("B");
    expect(asB.celebrations?.get("a")).toBe("unlocked");
  });

  it("利用者が変わって差分が無ければ、前の利用者の印を消す (空の Map)", () => {
    const asA = planCelebration(null, "A", tree, readPrev);
    // C は保存が無い = 初回扱いなので、演出は出ない。
    const asC = planCelebration(asA.memory, "C", tree, readPrev);
    expect(asC.celebrations?.size).toBe(0);
    expect(asC.memory?.userId).toBe("C");
  });

  it("ログアウト (userId が null) でも前の利用者の印を消す", () => {
    const asA = planCelebration(null, "A", tree, readPrev);
    const loggedOut = planCelebration(asA.memory, null, tree, readPrev);
    expect(loggedOut.celebrations?.size).toBe(0);
    expect(loggedOut.memory).toBeNull();
    expect(loggedOut.snapshot).toBeNull();
  });

  it("星がまだ来ていないときは保存しない", () => {
    const plan = planCelebration(null, "A", [], readPrev);
    expect(plan.snapshot).toBeNull();
    expect(plan.celebrations).toBeNull();
  });
});
