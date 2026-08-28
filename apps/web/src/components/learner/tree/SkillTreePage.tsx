/**
 * スキルツリー画面 (Phase 3a)。
 *
 * ホームの「スキルマップ」は今日の一手を決める場所、こちらは **全体を眺める場所**。
 * 星座の俯瞰と、星ごとの腕試し (レベル測定 / 飛び級) をここに集める。
 *
 * ホームのスキルマップはいまのコースの鎖だけを描く。こちらは同じデータ
 * (`GET /api/skill-map/mine`) で全体を俯瞰する。
 */

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardActions } from "@/components/ui/card";
import { RadialProgress } from "@/components/ui/radial-progress";
import { SkeletonRows } from "@/components/ui/skeleton";
import { useSkillMap, useStageQueue } from "@/hooks/useSkillMap";
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

  if (!backendEnabled) {
    return (
      <div className="p-6 text-[12.5px] text-ink-3">
        スキルツリーは実データ（API）に接続しているときだけ表示します。
      </div>
    );
  }

  return (
    // 余白は AppShell の本文コンテナが持っている。ここで重ねると二重になる。
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>スキルツリー</CardTitle>
          <CardActions>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[11px] text-ink-3">修了したスキル</div>
                <div className="text-[15px] font-semibold tabular-nums">
                  {cleared} / {nodes.length}
                </div>
              </div>
              <RadialProgress
                value={levelPercent}
                size={44}
                thickness={5}
                label={
                  level
                    ? `レベル ${level.level} · 次のレベルまで ${level.xp_to_next_level} XP`
                    : "レベル読み込み中"
                }
              >
                <div className="leading-none">
                  <div className="text-[8px] text-ink-3">Lv</div>
                  <div className="text-[12px] font-semibold tabular-nums">
                    {level?.level ?? "—"}
                  </div>
                </div>
              </RadialProgress>
            </div>
          </CardActions>
        </CardHeader>

        <CardContent className={cn("px-0 pb-0")}>
          <p className="px-4 pb-3 text-[11.5px] text-ink-3 sm:px-6">
            中心のスキルから始めて、外のスキルへ広がっていきます。盤面はドラッグで動かせます。スキルをクリックすると、そのスキルでできるようになることや解放条件が見られます。まだ開いていないスキルも、腕試しに合格すれば飛び級で開けます。
          </p>

          {skillMap.loading && nodes.length === 0 ? (
            <SkeletonRows rows={5} className="px-4 pb-6 sm:px-6" />
          ) : skillMap.error ? (
            <div className="flex flex-wrap items-center gap-3 px-4 pb-6 sm:px-6">
              <span className="text-[12.5px] text-danger">{skillMap.error}</span>
              <Button size="sm" variant="ghost" onClick={() => void skillMap.refetch()}>
                再読み込み
              </Button>
            </div>
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
              // 盤面はスクロールではなくパン / ズームで見る箱。高さをここで決める。
              className="mx-4 mb-4 h-[65vh] min-h-[420px] sm:mx-6"
            />
          )}
        </CardContent>
      </Card>

      <SkillCheckDialog
        stageId={checkStageId}
        stageTitle={checkStage?.title ?? "このステージ"}
        onClose={() => setCheckStageId(null)}
        onFinished={handleFinished}
      />
    </div>
  );
}
