/**
 * 星の詳細 (名前・状態・本文・出すボタン) を、器に依らない 1 つの記述に落とす。
 *
 * 同じ内容を 2 つの器で出すため — sm 以上はポップオーバー、スマホ幅は下から出る
 * ドロワー。器ごとに条件を書くと「スマホでは修了済みの星に着手ボタンが残る」類の
 * ずれが必ず出るので、**何を出すかはここだけが決める**。器は受け取った記述を並べる。
 *
 * 秘匿の判断はここでもサーバの応答 (`state` / `visibility`) をそのまま写すだけで、
 * クライアントで解放条件を組み直さない (`SkillTree.tsx` の冒頭を参照)。
 */

import type { SkillMapStageNode } from "@/lib/skill-map-api";

import { fogObscured } from "./fog-display";

/** タイトルは霧の中でも届く (ぼかして出す)。無ければテーマ名 → 伏せ字に落ちる。 */
export function labelOf(node: SkillMapStageNode): string {
  return node.title ?? node.theme ?? "？？？";
}

/** 詳細の本文。器はこの種類で描き分ける。 */
export type StarDetailBody =
  /** 霧より先の星の予告文 (中身は語らない)。 */
  | { kind: "fog" }
  /** ロック星に出してよいのは解放条件だけ。 */
  | { kind: "lock"; text: string }
  /** 「このスキルを身につけた人は …」。 */
  | { kind: "can-do"; text: string }
  | { kind: "none" };

/** 出すボタン。霧より先の星には何も出さない (開始も腕試しもサーバが断る)。 */
export interface StarDetailActions {
  /** 腕試し。`challenge` = ロック星の飛び級 (強調)、`try` = 解放済みの力試し。 */
  skillCheck: "none" | "challenge" | "try";
  /** 「ここから始める」。 */
  start: boolean;
  /** 「キューに追加」。 */
  queue: boolean;
  /** 「このスキルは修了済み」の但し書き。 */
  clearedNote: boolean;
}

/** ボタンが 1 つでも出るか (出ないなら器は箱ごと描かない)。 */
export function hasStarActions(actions: StarDetailActions): boolean {
  return actions.skillCheck !== "none" || actions.start || actions.queue || actions.clearedNote;
}

export interface StarDetail {
  label: string;
  /** 名前をぼかすか (`full` より先の段で、開発者モードでないとき)。 */
  obscured: boolean;
  /** 読み上げ用の状態語。見た目 (色・形) だけで区別させない。 */
  stateText: string;
  body: StarDetailBody;
  actions: StarDetailActions;
}

export interface StarDetailInput {
  node: SkillMapStageNode;
  /** 進行中の星か。 */
  isActive: boolean;
  /** 既に「次にやるリスト」に積んであるか。 */
  queued: boolean;
  /** 開発者モード: 段を素通しし、名前をぼかさない。 */
  revealDev: boolean;
}

export function describeStar({ node, isActive, queued, revealDev }: StarDetailInput): StarDetail {
  /** 霧より先 (= `full` でない) の段。名前は出しても行動の導線は出さない。 */
  const beyond = node.visibility !== "full";
  const obscured = fogObscured(node.visibility, revealDev);
  const cleared = node.state === "cleared";
  const locked = node.state === "locked";

  const stateText = obscured
    ? "まだ見えない"
    : beyond
      ? "まだ先（開発者表示）"
      : cleared
        ? "クリア済み"
        : isActive
          ? "進行中"
          : locked
            ? "未解放"
            : "解放済み";

  const reasons = node.lock_reasons ?? [];
  const body: StarDetailBody = obscured
    ? { kind: "fog" }
    : locked
      ? {
          kind: "lock",
          text:
            reasons.length > 0
              ? `${reasons.join(" / ")} をクリアすると開きます`
              : "前提のステージをクリアすると開きます",
        }
      : node.can_do
        ? { kind: "can-do", text: node.can_do }
        : { kind: "none" };

  const actions: StarDetailActions = beyond
    ? // 霧より先の星には導線を出さない。開始も腕試しもフォーカスもサーバが断るので、
      // ボタンを出すと「押せるのに必ず失敗する」になる。飛び級の入口は 1 歩先まで。
      { skillCheck: "none", start: false, queue: false, clearedNote: false }
    : {
        skillCheck: locked ? "challenge" : "try",
        // 修了した星に着手の導線は出さない (サーバも切り替えを 400 で断る)。
        // 解放済みなら **割り当ての有無によらず** 始められる (Phase 3b) —
        // 受講登録は「ここから始める」を押した時点で自分で作る。
        start: !locked && !cleared && !isActive,
        // キューだけは受講登録のある星に限る (キュー API が登録を要求するため)。
        queue: !locked && !cleared && !isActive && !queued && node.enrolled === true,
        clearedNote: cleared,
      };

  return { label: labelOf(node), obscured, stateText, body, actions };
}
