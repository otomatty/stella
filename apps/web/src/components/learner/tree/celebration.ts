/**
 * スキルツリーのゲーム演出 — 「新しく解放された / 新しく現れた星」の検出。
 *
 * サーバは「いまの状態」しか返さないので、**前回見たときとの差分**はクライアントが
 * 覚えるしかない。前回のスナップショット (星 id → 状態 / 視界) を localStorage に
 * 持ち、開くたびに差分を取って演出対象を決める。
 *
 * - `unlocked` … 前回は locked だった星が開いた (前提クリア / 腕試し合格 / 前提の撤回)
 * - `appeared` … 前回は無かった・霧だった星が名前つきで見えるようになった
 *                (教材の公開・霧が晴れた)
 *
 * ## 演出は 1 回きり
 *
 * 検出した瞬間に新しいスナップショットを保存するので、再訪やタブの開き直しでは
 * 再生されない (毎回光る演出は 3 回目から騒音になる)。初回訪問 (スナップショットが
 * 無い) も鳴らさない — 全部の星が「新しく現れた」ことになってしまうため。
 *
 * 保存は本人の閲覧記録でしかないので、消えても害はない (次回が「初回」扱いに
 * 戻るだけ)。localStorage が使えない環境では演出ごと諦める (機能には影響しない)。
 */

import { useEffect, useRef, useState } from "react";

import type { SkillMapStageNode } from "@/lib/skill-map-api";

export type CelebrationKind = "unlocked" | "appeared";

/** 前回スナップショットの 1 星ぶん。キーを縮めて localStorage を細く保つ。 */
interface SeenNode {
  /** state */
  s: string;
  /** visibility */
  v: string;
}

export type Snapshot = Record<string, SeenNode>;

const STORAGE_PREFIX = "falcon_skill_tree_seen_v1";

export function snapshotOf(nodes: SkillMapStageNode[]): Snapshot {
  const snapshot: Snapshot = {};
  for (const node of nodes) snapshot[node.id] = { s: node.state, v: node.visibility };
  return snapshot;
}

/**
 * 前回スナップショットとの差分から演出対象を決める。純関数 (単体で試せる)。
 *
 * `prev` が null (初回) なら何も祝わない。霧の星はそもそも名前が無いので祝わない。
 */
export function celebrationsFor(
  prev: Snapshot | null,
  nodes: SkillMapStageNode[],
): Map<string, CelebrationKind> {
  const found = new Map<string, CelebrationKind>();
  if (prev === null) return found;
  for (const node of nodes) {
    if (node.visibility === "fog") continue;
    const before = prev[node.id];
    if (before === undefined || before.v === "fog") {
      found.set(node.id, "appeared");
      continue;
    }
    if (before.s === "locked" && (node.state === "unlocked" || node.state === "active")) {
      found.set(node.id, "unlocked");
    }
  }
  return found;
}

function storageKeyOf(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readSnapshot(userId: string): Snapshot | null {
  try {
    const raw = window.localStorage.getItem(storageKeyOf(userId));
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Snapshot) : null;
  } catch {
    return null;
  }
}

function writeSnapshot(userId: string, snapshot: Snapshot): void {
  try {
    window.localStorage.setItem(storageKeyOf(userId), JSON.stringify(snapshot));
  } catch {
    // 書けない環境 (プライベートモード等) では次回も演出が出ないだけ。
  }
}

/**
 * 直前にこの画面が保存した内容。**誰のぶんか** まで覚える。
 *
 * ここに userId が無いと、A → B とログインが切り替わったのに木の形が同じだったとき
 * 「保存済み」と判断して B のスナップショットを書かず、A の「解放!/NEW」も出したまま
 * になる。認証層は別タブの token 変更 (`storage` イベント) でも session を差し替える
 * ので、画面を開いたまま利用者が変わることは実際に起こりうる。
 */
export interface CelebrationMemory {
  userId: string;
  serialized: string;
}

/** 次に何をするかの指示。`celebrations` が null なら画面の印は据え置き。 */
export interface CelebrationPlan {
  memory: CelebrationMemory | null;
  /** localStorage へ書くスナップショット (null なら書かない)。 */
  snapshot: Snapshot | null;
  /** 画面に出す演出 (空の Map = 前の印を消す)。null = 変えない。 */
  celebrations: Map<string, CelebrationKind> | null;
}

/**
 * 記憶といまの入力から、次にやることを決める純関数 (Hook の中身。単体で試せる)。
 *
 * 利用者が変わったら記憶ごと捨て、**新しい利用者のスナップショットで**差分を取り直す。
 */
export function planCelebration(
  memory: CelebrationMemory | null,
  userId: string | null,
  nodes: SkillMapStageNode[],
  readPrev: (userId: string) => Snapshot | null,
): CelebrationPlan {
  // 利用者が変わった / 居なくなった → 前の利用者の印は必ず落とす。
  const switched = memory !== null && memory.userId !== userId;
  const carried = switched ? null : memory;

  if (userId === null || nodes.length === 0) {
    return { memory: carried, snapshot: null, celebrations: switched ? new Map() : null };
  }
  const next = snapshotOf(nodes);
  const serialized = JSON.stringify(next);
  // 同じ利用者で同じ木なら何もしない (StrictMode の二重実行と再取得を吸収する)。
  if (carried?.serialized === serialized) {
    return { memory: carried, snapshot: null, celebrations: null };
  }
  return {
    memory: { userId, serialized },
    snapshot: next,
    celebrations: celebrationsFor(readPrev(userId), nodes),
  };
}

/**
 * 星の一覧が変わるたびに差分を取り、演出対象の星 id を返す Hook。
 *
 * 返り値は「この描画で演出を付ける星」。差分を取った時点でスナップショットを
 * 保存するので、同じ差分が二度返ることはない。判断は `planCelebration` が持ち、
 * ここは localStorage と state をつなぐだけ。
 */
export function useSkillTreeCelebration(
  userId: string | null,
  nodes: SkillMapStageNode[],
): Map<string, CelebrationKind> {
  const [celebrations, setCelebrations] = useState<Map<string, CelebrationKind>>(new Map());
  const memory = useRef<CelebrationMemory | null>(null);

  useEffect(() => {
    const plan = planCelebration(memory.current, userId, nodes, readSnapshot);
    memory.current = plan.memory;
    if (plan.snapshot !== null && userId !== null) writeSnapshot(userId, plan.snapshot);
    const next = plan.celebrations;
    if (next === null) return;
    // 既に空なら空のまま (無意味な再描画を挟まない)。
    setCelebrations((prev) => (prev.size === 0 && next.size === 0 ? prev : next));
  }, [userId, nodes]);

  return celebrations;
}
