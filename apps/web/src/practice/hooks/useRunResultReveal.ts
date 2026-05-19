/**
 * 採点結果の staggered reveal アニメーション状態機械。
 *
 * 旧 `RunResultDialog` 内のローカル state を抽出 (#107)。
 * Dialog (celebration 用) と下部パネルの「採点結果」タブで共有することで、
 * 二重再生 (両方で同時に reveal アニメが走る) を回避する。
 *
 * - 初期状態は `"idle"` (= まだ採点が走っていない)。 下部パネル「採点結果」 タブで
 *   「採点を実行を押すと…」 の案内を出すための状態 (codex P2 対応)。
 * - `sessionId` が変わる (= 新しい採点が始まる) たびに phase を `"lint"` に巻き戻し、
 *   `380ms` 間隔で `lint → ast → tests` と段階表示。 初回マウントでは進めない。
 * - `tests` フェーズでは `result` が来てから `320ms` ごとに 1 件ずつ `revealedTests` を増やす。
 * - 全件 reveal 完了で `"done"` に進む。
 */

import { useEffect, useRef, useState } from "react";

import type { ExecutionResult } from "./useGradeRunner.js";

export type RunResultPhase = "idle" | "lint" | "ast" | "tests" | "done";

const STEP_DELAY_MS = 380;
const TEST_REVEAL_DELAY_MS = 320;

export interface RunResultReveal {
  phase: RunResultPhase;
  revealedTests: number;
}

/**
 * @param sessionId 採点セッション識別子。 `handleRun` のたびにインクリメントする整数 (or 文字列)。
 *   値が変わった瞬間に reveal 状態が初期化される。 初回マウント時は idle のままで止める。
 * @param result 採点結果 (未完了時は null)。
 */
export function useRunResultReveal(
  sessionId: number | string,
  result: ExecutionResult | null,
): RunResultReveal {
  const [phase, setPhase] = useState<RunResultPhase>("idle");
  const [revealedTests, setRevealedTests] = useState(0);
  // 初回マウントでは sessionId が「変わった」 とは見なさない (initial value だから)。
  // これがないと初期 0 → 0 の useEffect が走り、 採点していないのに reveal が進む。
  const initialized = useRef(false);

  // session 切替: 巻き戻し + reveal 開始
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    setPhase("lint");
    setRevealedTests(0);
  }, [sessionId]);

  // lint → ast
  useEffect(() => {
    if (phase !== "lint") {return;}
    const t = window.setTimeout(() => setPhase("ast"), STEP_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // ast → tests
  useEffect(() => {
    if (phase !== "ast") {return;}
    const t = window.setTimeout(() => setPhase("tests"), STEP_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // tests: 1 件ずつ reveal → 全件で done
  useEffect(() => {
    if (phase !== "tests" || !result) {return;}
    if (revealedTests >= result.testResults.length) {
      const t = window.setTimeout(() => setPhase("done"), STEP_DELAY_MS);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(
      () => setRevealedTests((n) => n + 1),
      TEST_REVEAL_DELAY_MS,
    );
    return () => window.clearTimeout(t);
  }, [phase, result, revealedTests]);

  return { phase, revealedTests };
}
