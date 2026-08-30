/**
 * スキルツリー画面 (Phase 3a)。
 *
 * ホームの「スキルマップ」は今日の一手を決める場所、こちらは **全体を眺める場所**。
 * 星座の俯瞰と、星ごとの腕試し (レベル測定 / 飛び級) をここに集める。
 *
 * ホームのスキルマップはいまのコースの鎖だけを描く。こちらは同じデータ
 * (`GET /api/skill-map/mine`) で全体を俯瞰する。
 */

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { RadialProgress } from "@/components/ui/radial-progress";
import { useSkillMap, useStageQueue } from "@/hooks/useSkillMap";
import { isDevModeEnabled, subscribeDevMode } from "@/lib/dev-mode";
import type { SkillCheckResult } from "@/lib/skill-check-api";
import { cn } from "@/lib/utils";

import { SkillCheckDialog } from "./SkillCheckDialog";
import { SkillTree } from "./SkillTree";

interface SkillTreePageProps {
  currentUserId: string | null;
  backendEnabled: boolean;
  /**
   * 受講中ステージの一覧を取り直す (Phase 3b)。
   *
   * ここで星を始めると受講登録がその場で増えるので、シェルが持っている一覧
   * (ステージ一覧・ホームの「続きから」の材料) も取り直しておく。
   */
  refetchStages: () => void;
}

export function SkillTreePage({
  currentUserId,
  backendEnabled,
  refetchStages,
}: SkillTreePageProps) {
  const skillMap = useSkillMap(currentUserId, backendEnabled);
  const stageQueue = useStageQueue(currentUserId, backendEnabled);
  const [revealDev, setRevealDev] = useState(isDevModeEnabled);
  useEffect(() => subscribeDevMode(setRevealDev), []);
  /** 腕試しを開いている星 (null なら閉じている)。 */
  const [checkStageId, setCheckStageId] = useState<string | null>(null);

  const nodes = skillMap.map?.stages ?? [];
  const cleared = skillMap.map?.cleared_count ?? 0;
  const level = skillMap.profile?.level;
  const levelPercent =
    level && level.xp_into_level + level.xp_to_next_level > 0
      ? Math.round((level.xp_into_level / (level.xp_into_level + level.xp_to_next_level)) * 100)
      : 0;

  const checkStage = nodes.find((n) => n.id === checkStageId);

  /**
   * 星の切り替え / キュー操作の失敗は必ず文字にする。
   *
   * `setActiveStage` は失敗をそのまま投げるので、投げっぱなしにすると画面上は
   * 「押しても何も起きない」になる (ホームと同じ方針)。
   */
  const run = (op: () => Promise<unknown>, fallback: string) => {
    void op().catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : fallback);
    });
  };

  const handleFinished = (result: SkillCheckResult) => {
    if (result.unlocked) {
      // 解放と同時に自己開始の受講登録も作られる (= すぐ「ここから始める」が出る)。
      toast.success(`新しいスキルが解放されました。ここから始められます — ${result.title}`);
      // 登録が増えたので、シェルの受講中一覧も取り直す (自己開始と同じ理由)。
      refetchStages();
    }
    // 合否によらず引き直す (解放されたかどうかの判断はサーバの応答に任せる)。
    void skillMap.refetch();
  };

  /** 盤面はヘッダーの下からビューポートの下端まで (LessonPlayer と同じ式)。 */
  const boardClass = "h-[calc(100vh-var(--shell-header-height))] w-full";

  if (!backendEnabled) {
    return (
      <BoardMessage className={boardClass}>
        スキルツリーは実データ（API）に接続しているときだけ表示します。
      </BoardMessage>
    );
  }

  const hud = (
    <div className="tree-hud flex items-center gap-3 rounded-full border py-1.5 pl-4 pr-2">
      <div className="text-[13px] font-semibold">スキルツリー</div>
      <div className="text-[12px] tabular-nums">
        <span className="tree-hint">修了 </span>
        {cleared} / {nodes.length}
      </div>
      <RadialProgress
        value={levelPercent}
        size={36}
        thickness={4}
        label={
          level
            ? `レベル ${level.level} · 次のレベルまで ${level.xp_to_next_level} XP`
            : "レベル読み込み中"
        }
      >
        <div className="leading-none">
          <div className="tree-hint text-[7px]">Lv</div>
          <div className="text-[11px] font-semibold tabular-nums">{level?.level ?? "—"}</div>
        </div>
      </RadialProgress>
    </div>
  );

  return (
    // 余白も Card も持たない — シェルが flush で描くので、盤面がコンテンツ領域そのもの。
    <>
      {skillMap.loading && nodes.length === 0 ? (
        <BoardMessage className={boardClass}>
          <span role="status" aria-live="polite">
            スキルツリーを読み込んでいます…
          </span>
        </BoardMessage>
      ) : skillMap.error ? (
        <BoardMessage className={boardClass}>
          <span className="text-danger">{skillMap.error}</span>
          <Button size="sm" variant="ghost" onClick={() => void skillMap.refetch()}>
            再読み込み
          </Button>
        </BoardMessage>
      ) : (
        <SkillTree
          nodes={nodes}
          currentUserId={currentUserId}
          activeStageId={skillMap.map?.active_stage_id ?? null}
          queuedStageIds={stageQueue.queue}
          onStartStage={(stageId) =>
            run(
              () =>
                // Phase 3b: 押した時点で自己開始 (受講登録) → 進行中へ。
                skillMap
                  .startStage(stageId)
                  .then(() => {
                    refetchStages();
                    return stageQueue.refetch();
                  })
                  .then(() => {
                    // ホームのスキルマップは乗り換えに確認ダイアログを挟むが、ここは星の
                    // ポップオーバーを開いて押す 2 手が既に確認になっている。
                    // 代わりに「切り替わった」ことを必ず文字で返す。
                    const title = nodes.find((n) => n.id === stageId)?.title;
                    toast.success(`${title ?? "このステージ"} を進行中にしました`);
                  }),
              "ステージを始められませんでした",
            )
          }
          onQueueStage={(stageId) =>
            run(() => stageQueue.add(stageId), "キューへの追加に失敗しました")
          }
          onSkillCheck={setCheckStageId}
          revealDev={revealDev}
          hud={hud}
          // 全面なので角丸と枠は要らない。
          className={cn(boardClass, "rounded-none border-0")}
        />
      )}

      <SkillCheckDialog
        stageId={checkStageId}
        stageTitle={checkStage?.title ?? "このステージ"}
        onClose={() => setCheckStageId(null)}
        onFinished={handleFinished}
      />
    </>
  );
}

/** 盤面と同じ星空の上に、読み込み中 / エラー / 未接続の文言を置く (白いカードが出ない)。 */
function BoardMessage({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "tree-board flex flex-wrap items-center justify-center gap-3 text-[12.5px] text-[rgb(235_238_255/0.88)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
