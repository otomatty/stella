/**
 * スキルツリー画面 (Phase 3a)。
 *
 * ホームの「スキルマップ」は今日の一手を決める場所、こちらは **全体を眺める場所**。
 * 星座の俯瞰と、星ごとの腕試し (レベル測定 / 飛び級) をここに集める。
 *
 * ホームのスキルマップはいまのコースの鎖だけを描く。こちらは同じデータ
 * (`GET /api/skill-map/mine`) で全体を俯瞰する。
 */

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { RadialProgress } from "@/components/ui/radial-progress";
import type { Stage } from "@/data/types";
import { useSkillMap, useStageQueue } from "@/hooks/useSkillMap";
import { isDevModeEnabled, revealsDevMap, subscribeDevMode } from "@/lib/dev-mode";
import { loadMap, whenProgressReady } from "@/lib/lesson-progress";
import type { SkillCheckResult } from "@/lib/skill-check-api";
import { cn } from "@/lib/utils";

import { SkillCheckDialog } from "./SkillCheckDialog";
import { SkillTree } from "./SkillTree";
import { startDestination } from "./start-destination";

interface SkillTreePageProps {
  currentUserId: string | null;
  backendEnabled: boolean;
  /**
   * 受講中ステージの一覧を取り直す (Phase 3b)。
   *
   * ここで星を始めると受講登録がその場で増えるので、シェルが持っている一覧
   * (ステージ一覧・ホームの「続きから」の材料) も取り直しておく。
   *
   * 戻り値の一覧は「始めた直後にどのレッスンを開くか」の判定に使う (state の反映を
   * 待たずに済ませるため — `stages-source.ts` の `refetch` 参照)。
   */
  refetchStages: () => Promise<Stage[]>;
  /** レッスン画面を開く (シェルの共通導線 = 受講位置も控える)。 */
  onOpenLesson: (stage: Stage, lessonId: string) => void;
}

export function SkillTreePage({
  currentUserId,
  backendEnabled,
  refetchStages,
  onOpenLesson,
}: SkillTreePageProps) {
  const skillMap = useSkillMap(currentUserId, backendEnabled);
  const stageQueue = useStageQueue(currentUserId, backendEnabled);
  /**
   * 開始の版番号と、この画面がまだ生きているか。
   *
   * 「ここから始める」は開始 → 一覧の取り直し → 進捗の決着待ちと最大数秒かかる。
   * その間に受講者がサイドバーやブラウザの戻るで別の画面へ移ったり、別の星を
   * 押し直したりしたら、あとから届く遷移は **受講者が選んだ行き先への割り込み**
   * になる。押した時点の版を控えておき、着地の直前に照合して捨てる。
   */
  const startSeqRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  /**
   * FAB の状態 (localStorage)。これ **だけ** ではぼかしを外さない。
   *
   * サーバが `DEV_MODE` を持たない本番では、応答の `dev_mode` が偽のままなので
   * `revealDev` も偽になる (Issue #271 — クライアントの値だけで判断していたため、
   * 本番の新規セッションで霧の星の実名が出ていた)。
   */
  const [devModeRequested, setDevModeRequested] = useState(isDevModeEnabled);
  useEffect(() => subscribeDevMode(setDevModeRequested), []);
  /** 腕試しを開いている星 (null なら閉じている)。 */
  const [checkStageId, setCheckStageId] = useState<string | null>(null);

  const nodes = skillMap.map?.stages ?? [];
  /**
   * 段を素通しで描いてよいか = ローカルの設定 **かつ** サーバが確認した開発モード。
   *
   * 応答が来るまでは偽 = ぼかす側に倒す (先に描いてから伏せ直すと、一瞬だけ実名が出る)。
   */
  const revealDev = revealsDevMap(devModeRequested, skillMap.map?.dev_mode);
  const cleared = skillMap.map?.cleared_count ?? 0;
  /**
   * 「修了 x / y」の分母は配信対象の総数。応答の星数を使うと、視界が広がるたびに
   * 分母が増えて「全体のどこまで来たか」が読めなくなる。
   */
  const totalStages = skillMap.map?.stage_count ?? nodes.length;
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
      void refetchStages();
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
        {cleared} / {totalStages}
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
              // Phase 3b: 押した時点で自己開始 (受講登録) → 進行中へ。
              // そのまま最初のレッスンまで開く (開始と学習開始を 1 手にまとめる)。
              async () => {
                const seq = ++startSeqRef.current;
                await skillMap.startStage(stageId);
                const [stages] = await Promise.all([refetchStages(), stageQueue.refetch()]);
                // ホームのスキルマップは乗り換えに確認ダイアログを挟むが、ここは星の
                // ポップオーバーを開いて押す 2 手が既に確認になっている。
                // 代わりに「切り替わった」ことを必ず文字で返す。
                const title = nodes.find((n) => n.id === stageId)?.title;
                toast.success(`${title ?? "このステージ"} を進行中にしました`);
                // 進捗は **この時点の値** を読む。描画時の値を閉じ込めると、サーバ進捗の
                // 取り込みが決着する前に押した手が古い地図で遷移先を決めてしまい、
                // 途中まで進めてある星 (解放済みで進行中でない星にも「ここから始める」
                // は出る) を先頭レッスンへ引き戻す。
                await whenProgressReady();
                // 押したあとに画面を離れた / 別の星を押し直したなら、ここでの遷移は
                // 受講者が選んだ行き先への割り込みになるので捨てる (開始自体は済んで
                // いるので、上のトーストとステージ一覧に残る)。
                if (!mountedRef.current || seq !== startSeqRef.current) return;
                // 開くレッスンが決まらない星 (準備中の講座など) はツリーに留まる。
                const target = startDestination(stages, stageId, loadMap());
                if (target) onOpenLesson(target.stage, target.lessonId);
              },
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

/** 盤面と同じ面の上に、読み込み中 / エラー / 未接続の文言を置く (白いカードが出ない)。 */
function BoardMessage({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "tree-board flex flex-wrap items-center justify-center gap-3 text-[12.5px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
