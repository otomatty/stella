/**
 * 受講者のホーム — **スキルツリーが主役** の 1 画面。
 *
 * 盤面 (スキルツリー) が画面いっぱいに広がり、その上に浮かぶガイドのカードが
 * 「次にやること」を 1 つだけ大きく言う。盤面は「それがツリーのどこか」を見せる。
 * ステージ一覧と別ページのスキルツリーはここへ集約した — 受講中の星は盤面の上で開き
 * (「続きから」「レッスン一覧」)、まだ始めていない星もその場で始められる。
 *
 * ## ガイドは浮かぶカード
 *
 * PC では左上、スマホ・タブレットでは下端に浮かぶ (右下の AI ボタンには掛けない)。
 * 畳むと「次にやること」の 1 行と主ボタンだけになり、盤面を広く見られる。既定は PC で
 * 開き、スマホ・タブレットでは畳む。PC で開いている間は、カードの陰を盤面の
 * 「見えている範囲」から外す (`insetLeft`) — 寄せた星がカードの下に隠れないように。
 *
 * ## 前の版から変えたこと
 *
 * - ホームは縦に長いダッシュボード (HUD・今日のプラン・縦一本のスキルマップ・
 *   次にやるリスト・KPI・提出履歴・学習時間・お知らせ・期限・AI) だった。今日の行動に
 *   直結しない記録は「学習の記録」(`/records`) へ移し、ここは今日の一手だけを残す
 * - 縦一本の「スキルマップ」(StagePath) はやめた。同じ星を 2 つの描き方で見せると、
 *   どちらが本物の現在地か迷う。現在地はツリーの脈打つ星と、ガイドの「次にやること」
 * - 「続きから」は 1 か所 (ガイドの主ボタン) に絞った。ツリーの現在地の星にも出るが、
 *   同じ行き先を指す
 * - プレースメント (初回の案内) はガイドの最初の手順になった。ツリーが横に見えている
 *   ので「あとで選ぶ」で閉じる必要が無い
 *
 * 何をどの順でガイドに並べるかは `@/lib/home-guide` (純関数) が決める。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Stage } from "@/data/types";
import { useLessonProgressMap } from "@/hooks/useLessonProgress";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMySubmissions } from "@/hooks/useMySubmissions";
import { useSkillMap, useStageQueue } from "@/hooks/useSkillMap";
import { useSrsToday } from "@/hooks/useSrsToday";
import {
  HallOfFameInviteRow,
  useHallOfFameInvite,
} from "@/components/hall-of-fame/HallOfFameInvite";
import { DiscoveryDialog } from "@/components/learner/discovery/DiscoveryDialog";
import { HomeHud } from "@/components/learner/home/HomeHud";
import {
  GuideSection,
  LaterSteps,
  NextStepBar,
  NextStepCard,
  type GuideActiveStage,
  type GuideHandlers,
} from "@/components/learner/home/NextStep";
import { StageQueuePanel } from "@/components/learner/home/StageQueuePanel";
import { UnlockNotice } from "@/components/learner/home/UnlockNotice";
import { SkillCheckDialog } from "@/components/learner/tree/SkillCheckDialog";
import {
  SkillTree,
  type SkillTreeHandle,
  type TreeSpotlight,
} from "@/components/learner/tree/SkillTree";
import { startDestination } from "@/components/learner/tree/start-destination";
import { isDevModeEnabled, revealsDevMap, subscribeDevMode } from "@/lib/dev-mode";
import { buildHomeGuide, suggestedStageIds } from "@/lib/home-guide";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Sparkles,
  TrendingUp,
} from "@/lib/icons";
import { findNextLesson, loadMap, whenProgressReady } from "@/lib/lesson-progress";
import type { SkillCheckResult } from "@/lib/skill-check-api";
import { buildTodayPlan } from "@/lib/today-plan";
import { cn } from "@/lib/utils";

/** PC で開いたガイドのカードが覆う幅 (左の余白 16px + 幅 360px + 右の余白 16px)。 */
const GUIDE_INSET_PX = 392;

interface LearnerHomeProps {
  setPage: (page: string) => void;
  /** 指定のレッスンでレッスン画面を開く (シェルの共通導線 = 受講位置も控える)。 */
  onOpenLesson: (stage: Stage, lessonId: string) => void;
  stages: Stage[];
  stagesError: string | null;
  /**
   * 受講中ステージの一覧を取り直す (Phase 3b)。
   *
   * 自己開始で受講登録がその場で増えるので、開始したらこれを呼ぶ。戻り値の一覧は
   * 「始めた直後にどのレッスンを開くか」の判定に使う (state の反映を待たずに済ませる)。
   */
  refetchStages: () => Promise<Stage[]>;
  onOpenSubmission: (submissionId: string) => void;
  studentName: string;
  currentUserId: string | null;
  backendEnabled: boolean;
}

export const LearnerHome = ({
  setPage,
  onOpenLesson,
  stages,
  stagesError,
  refetchStages,
  onOpenSubmission,
  studentName,
  currentUserId,
  backendEnabled,
}: LearnerHomeProps) => {
  const navigate = useNavigate();
  const progressMap = useLessonProgressMap();
  // 取得に失敗すると一覧は空になる (= 「見直す」が黙って消える) ので、失敗も受け取って出す。
  const { submissions, error: submissionsError } = useMySubmissions(true);
  // 「今日の復習」(SRS) の残り問題数。カードが無い/今日ぶんゼロならプランに出さない。
  const { review, error: reviewError } = useSrsToday(currentUserId, backendEnabled);
  const skillMap = useSkillMap(currentUserId, backendEnabled);
  const stageQueue = useStageQueue(currentUserId, backendEnabled);
  // 殿堂への招待 (Phase 5)。届いていない人には何も出ない。
  const hofInvited = useHallOfFameInvite(backendEnabled);
  const treeRef = useRef<SkillTreeHandle | null>(null);

  /**
   * FAB の状態 (localStorage)。これ **だけ** ではぼかしを外さない。
   *
   * サーバが `DEV_MODE` を持たない本番では、応答の `dev_mode` が偽のままなので
   * `revealDev` も偽になる (Issue #271 — クライアントの値だけで判断していたため、
   * 本番の新規セッションで霧の星の実名が出ていた)。応答が来るまでは偽 = ぼかす側。
   */
  const [devModeRequested, setDevModeRequested] = useState(isDevModeEnabled);
  useEffect(() => subscribeDevMode(setDevModeRequested), []);
  const revealDev = revealsDevMap(devModeRequested, skillMap.map?.dev_mode);

  const nodes = skillMap.map?.stages ?? [];
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const stageById = useMemo(() => {
    const map = new Map(stages.map((s) => [s.id, s]));
    return (id: string) => map.get(id);
  }, [stages]);

  /**
   * いま進める星。**サーバの学習フォーカスをそのまま採る**。
   *
   * サーバが星を指しているのに自分のステージ一覧から引けない (割当が外れた等) とき、
   * 別の星に読み替えない — ツリーに描く「現在地」と「続きから」がずれ、押した先が
   * サーバの言う進行中と違う星になるため。その場合は現在地なしで描き、ガイドに
   * フォーカスを外す導線を出す (`focusLost`)。
   *
   * サーバが「進行中なし」(null) と言ったら、そのまま進行中なしとして扱う — サーバは
   * 直近の進捗から視界の規則つきで導出したうえで null を返している。ここで受講中の
   * 先頭を当て推量すると、ツリーではまだ鍵の掛かった星 (全講座に登録のある受講者の
   * 島の星など) を「続きから」と言ってしまう。当て推量はデモ (バックエンド未設定) と、
   * 地図の取得に失敗したときの「続きから」の救済にだけ使う。
   */
  const serverActiveStageId = skillMap.map?.active_stage_id ?? null;
  const serverActiveStage = serverActiveStageId ? stageById(serverActiveStageId) : undefined;
  const focusLost = Boolean(serverActiveStageId) && !serverActiveStage;
  const guessActive = !backendEnabled || (skillMap.map === null && skillMap.error !== null);
  const fallbackStage = guessActive
    ? (stages.find((c) => !c.completed && c.progress > 0) ??
      stages.find((c) => !c.completed && (c.sections?.length ?? 0) > 0))
    : undefined;
  const activeStage = serverActiveStageId ? serverActiveStage : fallbackStage;
  const nextLesson = useMemo(
    () => findNextLesson(activeStage, progressMap),
    [activeStage, progressMap],
  );

  // 直近のつまずき: 添削で「再提出」「不合格」になった一番新しい提出。
  const recentMiss = submissions.find((s) => s.verdict === "resubmit" || s.verdict === "fail");
  const reviewDone = Boolean(review && review.questions.length === 0 && review.answered_today > 0);
  // 受講登録の有無はサーバの集約フラグを使う。星ごとの `enrolled` は霧より先に
  // 付かないので、星の配列で数えると「唯一の登録が 2 歩先」の受講者を取りこぼす。
  // 古い応答のときだけ星から数える。
  const hasEnrollment =
    skillMap.map?.has_enrollment ?? nodes.some((node) => node.enrolled === true);

  const guide = useMemo(() => {
    const plan = buildTodayPlan({
      srsDueCount: review?.questions.length ?? 0,
      activeStage:
        activeStage && nextLesson
          ? {
              stageTitle: activeStage.title,
              nextLessonTitle: nextLesson.lesson.title,
              // 下限は 0 (「残り 0 レッスン」はありうる状態)。
              remainingLessons: Math.max(activeStage.lessonsCount - nextLesson.lessonNumber + 1, 0),
            }
          : null,
      recentMiss: recentMiss ? { title: recentMiss.assignmentTitle, kind: "submission" } : null,
    });
    return buildHomeGuide({
      plan,
      // マップが届く前 (`null`) は「始めている」側に倒す — 初回の案内が一瞬だけ出て
      // 消える瞬きを避ける。
      hasEnrollment: skillMap.map ? hasEnrollment : true,
      activeWithoutLesson: Boolean(activeStage && !activeStage.completed && !nextLesson),
      suggestedStageIds: suggestedStageIds(
        nodes,
        skillMap.map?.next_stage_ids ?? [],
        serverActiveStageId,
      ),
      reviewDone,
    });
  }, [
    review,
    activeStage,
    nextLesson,
    recentMiss,
    skillMap.map,
    hasEnrollment,
    nodes,
    serverActiveStageId,
    reviewDone,
  ]);
  /** 先頭 (「次にやること」) は `NextStepCard` が `guide` から引く。ここは残りだけ。 */
  const later = guide.steps.slice(1);
  /** ガイドが勧めている星 (ツリーに「おすすめ」の輪を付ける)。 */
  const highlightStageIds = useMemo(
    () => guide.steps.find((s) => s.kind === "choose")?.stageIds ?? [],
    [guide],
  );

  // ----- 星を始める / 開く -----

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
  /** 開始中の星 (ガイドの「ここから始める」を二重に押させない)。 */
  const [startingId, setStartingId] = useState<string | null>(null);

  /**
   * 星を始めて、そのまま最初のレッスン (一度始めた星なら続き) を開く (Phase 3b)。
   *
   * 開始 (受講登録) → フォーカス → **一覧とキューの取り直し** → 開くレッスンの決定。
   * 失敗は必ず文字にする — 投げっぱなしにすると画面上は「押しても何も起きない」になる。
   */
  const startStage = (stageId: string) => {
    const seq = ++startSeqRef.current;
    setStartingId(stageId);
    void (async () => {
      try {
        await skillMap.startStage(stageId);
        const [nextStages] = await Promise.all([refetchStages(), stageQueue.refetch()]);
        const title = nodeById.get(stageId)?.title;
        toast.success(`${title ?? "このステージ"} を進行中にしました`);
        // 進捗は **この時点の値** を読む。描画時の値を閉じ込めると、サーバ進捗の
        // 取り込みが決着する前に押した手が古い地図で遷移先を決めてしまい、
        // 途中まで進めてある星を先頭レッスンへ引き戻す。
        await whenProgressReady();
        // 押したあとに画面を離れた / 別の星を押し直したなら、ここでの遷移は捨てる
        // (開始自体は済んでいるので、上のトーストとツリーの現在地に残る)。
        if (!mountedRef.current || seq !== startSeqRef.current) return;
        // 開くレッスンが決まらない星 (準備中の講座など) はホームに留まる。
        const target = startDestination(nextStages, stageId, loadMap());
        if (target) onOpenLesson(target.stage, target.lessonId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "ステージを始められませんでした");
      } finally {
        if (mountedRef.current && seq === startSeqRef.current) setStartingId(null);
      }
    })();
  };

  /**
   * ガイドとキューからの「始める」。**既に進めている星があれば乗り換えを確かめる** —
   * 「1 つに絞る」設計なので黙って切り替えない。ツリーの星のポップオーバーは
   * 「開く → 押す」の 2 手が確認を兼ねるので、こちらを通さない。
   */
  const [pendingStageId, setPendingStageId] = useState<string | null>(null);
  const requestStart = (stageId: string) => {
    if (activeStage && !activeStage.completed && activeStage.id !== stageId) {
      setPendingStageId(stageId);
      return;
    }
    startStage(stageId);
  };
  const confirmSwitch = () => {
    if (!pendingStageId) return;
    const target = pendingStageId;
    setPendingStageId(null);
    startStage(target);
  };

  /** ステージ詳細 (レッスン一覧)。受講中の一覧から引くので、登録のある星だけが開ける。 */
  const openStage = (stageId: string) => {
    void navigate({ to: "/stages/$stageId", params: { stageId } });
  };

  /** その星の続き (未完了の先頭、無ければ読み返しの先頭) を開く。開けなければ詳細へ。 */
  const resumeStage = (stageId: string) => {
    const target = startDestination(stages, stageId, progressMap);
    if (target) onOpenLesson(target.stage, target.lessonId);
    else openStage(stageId);
  };

  const showInTree = (stageId: string) => {
    if (!treeRef.current?.focusStage(stageId)) {
      toast("この星はまだツリーに見えていません");
      return;
    }
    // スマホ・タブレットでは開いたカードが盤面の下半分を覆うので、畳んで星を見せる。
    if (!isDesktop) setExpandedPref(false);
  };

  const handlers: GuideHandlers = {
    onStartReview: () => setPage("daily-review"),
    onResumeLesson: () => {
      if (activeStage && nextLesson) onOpenLesson(activeStage, nextLesson.lesson.id);
    },
    onOpenMiss: () => {
      if (recentMiss) onOpenSubmission(recentMiss.id);
    },
    onOpenActiveStage: () => {
      if (activeStage) openStage(activeStage.id);
    },
    onStartStage: requestStart,
    onShowInTree: showInTree,
  };
  const guideActiveStage: GuideActiveStage | null = activeStage
    ? {
        id: activeStage.id,
        title: activeStage.title,
        progress: activeStage.progress,
        lessonsCount: activeStage.lessonsCount,
      }
    : null;
  const stepContext = {
    ...handlers,
    activeStage: guideActiveStage,
    nodeOf: (id: string) => nodeById.get(id),
    startingId,
  };

  /**
   * ツリーでいま取り組む星に常に出す詳細の札 (押さなくても読める)。
   *
   * 進行中の星があればそれ (次のレッスン・進捗・「続きから」)。無ければガイドが勧める
   * 先頭の星 (到達説明・「ここから始める」)。ガイドの主ボタンと同じ行き先を指す。
   */
  const chooseStep = guide.steps.find((step) => step.kind === "choose");
  const suggestedId = chooseStep?.kind === "choose" ? chooseStep.stageIds[0] : undefined;
  const suggestedNode = suggestedId ? nodeById.get(suggestedId) : undefined;
  const spotlight: TreeSpotlight | null =
    activeStage && !activeStage.completed
      ? {
          stageId: activeStage.id,
          eyebrow: "いま進めている",
          progress: activeStage.progress,
          ...(nextLesson
            ? {
                detail: `次は「${nextLesson.lesson.title}」`,
                action: {
                  label: "続きから",
                  icon: "play" as const,
                  onClick: () => onOpenLesson(activeStage, nextLesson.lesson.id),
                },
                secondary: { label: "レッスン一覧", onClick: () => openStage(activeStage.id) },
              }
            : {
                detail:
                  activeStage.lessonsCount === 0
                    ? "教材の準備中です。"
                    : "レッスンはすべて終わりました。課題とレビューの結果を確かめましょう。",
                action: {
                  label: "レッスン一覧",
                  icon: "book" as const,
                  onClick: () => openStage(activeStage.id),
                },
              }),
        }
      : suggestedId && suggestedNode
        ? {
            stageId: suggestedId,
            eyebrow:
              chooseStep?.kind === "choose" && chooseStep.welcome
                ? "はじめの一歩 · おすすめ"
                : "次はここ · おすすめ",
            ...(suggestedNode.can_do ? { detail: `身につくと ${suggestedNode.can_do}。` } : {}),
            action: {
              label: startingId === suggestedId ? "開始中…" : "ここから始める",
              icon: "play" as const,
              onClick: () => requestStart(suggestedId),
              disabled: startingId !== null,
            },
          }
        : null;

  // ----- 腕試し・発見教材 -----

  /** 腕試しを開いている星 (null なら閉じている)。 */
  const [checkStageId, setCheckStageId] = useState<string | null>(null);
  const handleSkillCheckFinished = (result: SkillCheckResult) => {
    if (result.unlocked) {
      // 解放と同時に自己開始の受講登録も作られる (= すぐ「ここから始める」が出る)。
      toast.success(`新しいスキルが解放されました。ここから始められます — ${result.title}`);
      void refetchStages();
    }
    // 合否によらず引き直す (解放されたかどうかの判断はサーバの応答に任せる)。
    void skillMap.refetch();
  };

  /**
   * 発見教材 (Phase 4)。**サーバが公開条件で絞ったものをそのまま描く**。
   * 受験ダイアログを閉じたらマップを引き直す — 合格の印と XP はサーバの再取得で更新する。
   */
  const discoveries = skillMap.map?.discoveries ?? [];
  const [openDiscoveryId, setOpenDiscoveryId] = useState<string | null>(null);
  const openDiscoveryTitle =
    discoveries.find((d) => d.id === openDiscoveryId)?.title ?? "発見した教材";

  /** ツリーで「もう開いている」星 (解放通知の比較対象)。 */
  const openStageIds = useMemo(
    () => nodes.filter((n) => n.state !== "locked" && n.visibility !== "fog").map((n) => n.id),
    [nodes],
  );

  /** 失敗は黙って捨てない (キュー・切り替え・取得)。 */
  const errors = [
    stagesError ? `ステージの取得に失敗しました: ${stagesError}` : null,
    reviewError ? `今日の復習の取得に失敗しました: ${reviewError}` : null,
    submissionsError ? `提出履歴の取得に失敗しました: ${submissionsError}` : null,
    skillMap.error && nodes.length > 0
      ? `スキルツリーの更新に失敗しました: ${skillMap.error}`
      : null,
    stageQueue.error ? `次にやるリストの更新に失敗しました: ${stageQueue.error}` : null,
  ].filter((e): e is string => e !== null);

  /**
   * ガイドのカードを開いているか。既定は PC (lg 以上) で開き、スマホ・タブレットでは
   * 畳む (下端に浮くカードが盤面を覆わないように)。押したあとは選んだ方を保つ。
   */
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [expandedPref, setExpandedPref] = useState<boolean | null>(null);
  const expanded = expandedPref ?? isDesktop;
  const loadingMap = backendEnabled && skillMap.map === null && !skillMap.error;

  return (
    <div className="relative h-[calc(100dvh-var(--shell-header-height))] overflow-hidden">
      {/* 盤面は画面いっぱい。ガイドはこの上に浮かぶ。 */}
      <div className="absolute inset-0">
        {!backendEnabled ? (
          <BoardMessage>
            スキルツリーは実データ（API）に接続しているときだけ表示します。
          </BoardMessage>
        ) : loadingMap || (skillMap.loading && nodes.length === 0) ? (
          <BoardMessage>
            <span role="status" aria-live="polite">
              スキルツリーを読み込んでいます…
            </span>
          </BoardMessage>
        ) : skillMap.error && nodes.length === 0 ? (
          <BoardMessage>
            <span className="text-danger">{skillMap.error}</span>
            <Button size="sm" variant="ghost" onClick={() => void skillMap.refetch()}>
              再読み込み
            </Button>
          </BoardMessage>
        ) : (
          <SkillTree
            nodes={nodes}
            currentUserId={currentUserId}
            activeStageId={serverActiveStageId}
            queuedStageIds={stageQueue.queue}
            onResumeStage={resumeStage}
            onStartStage={startStage}
            onQueueStage={(stageId) =>
              void stageQueue
                .add(stageId)
                .catch((err: unknown) =>
                  toast.error(err instanceof Error ? err.message : "キューへの追加に失敗しました"),
                )
            }
            onSkillCheck={setCheckStageId}
            onOpenStage={openStage}
            revealDev={revealDev}
            // 開いた直後は現在地へ寄せる。現在地が無ければ、勧めている先頭の星へ。
            initialFocusStageId={serverActiveStageId ?? highlightStageIds[0] ?? null}
            highlightStageIds={highlightStageIds}
            spotlight={spotlight}
            handleRef={treeRef}
            // PC で開いたカードの陰は「見えている範囲」から外す。
            insetLeft={isDesktop && expanded ? GUIDE_INSET_PX : 0}
            // 全面なので角丸と枠は要らない。
            className="h-full w-full rounded-none border-0"
          />
        )}
      </div>

      <aside
        aria-label="次にやること"
        className={cn(
          "absolute z-20 flex flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-xl backdrop-blur-md",
          // スマホ: 下端。右下の AI / 開発者モードのボタンに掛からないよう右を空ける。
          "bottom-3 left-3 right-[5.5rem]",
          // タブレット: 下端の左に、幅を決めて浮かべる。
          "sm:right-auto sm:w-[380px]",
          // PC: 左上。
          "lg:bottom-auto lg:left-4 lg:top-4 lg:w-[360px]",
          expanded ? "max-h-[70%] lg:max-h-[calc(100%-2rem)]" : "",
        )}
      >
        {expanded ? (
          <>
            <header className="flex shrink-0 flex-col gap-3 px-4 pt-4">
              <div className="flex items-start gap-2">
                <h1 className="min-w-0 flex-1 text-[15px] font-semibold tracking-tight">
                  おかえりなさい、{studentName}さん
                </h1>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="-mr-1.5 -mt-1 shrink-0"
                  aria-label="次にやることを畳む"
                  aria-expanded
                  onClick={() => setExpandedPref(false)}
                >
                  {/* 下に浮くとき (スマホ・タブレット) は下へ、左上に浮くとき (PC) は上へ畳む。 */}
                  <ChevronDown size={14} className="lg:hidden" />
                  <ChevronUp size={14} className="hidden lg:block" />
                </Button>
              </div>
              {backendEnabled ? (
                <HomeHud
                  profile={skillMap.profile}
                  focusBonus={skillMap.map?.focus_bonus ?? null}
                  cleared={
                    skillMap.map
                      ? {
                          count: skillMap.map.cleared_count,
                          // 分母は配信対象の総数 (視界が広がるたびに増えないように)。
                          total: skillMap.map.stage_count ?? nodes.length,
                        }
                      : null
                  }
                  loading={skillMap.loading}
                />
              ) : null}
            </header>

            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-4 pt-4">
              {errors.map((message) => (
                <p key={message} className="text-[12px] text-destructive">
                  {message}
                </p>
              ))}

              {focusLost ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-warning-soft px-3 py-2">
                  <span className="text-[11.5px] text-ink-2">
                    進行中のステージが見つかりません。別のステージを選び直してください。
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void skillMap
                        .setActiveStage(null)
                        .catch((err: unknown) =>
                          toast.error(
                            err instanceof Error ? err.message : "ステージの切り替えに失敗しました",
                          ),
                        )
                    }
                  >
                    フォーカスを外す
                  </Button>
                </div>
              ) : null}

              <UnlockNotice
                openStageIds={openStageIds}
                titleOf={(id) => nodeById.get(id)?.title ?? stageById(id)?.title}
                ready={Boolean(skillMap.map)}
                // 自分で切り替えた現在地は「新しく開いた星」ではない。
                activeStageId={serverActiveStageId}
                discoveries={discoveries}
                // 記憶は利用者ごと (共有端末で前の人の「見た」を引き継がない)。
                userId={currentUserId}
              />

              <NextStepCard guide={guide} loading={loadingMap} {...stepContext} />

              <LaterSteps steps={later} {...stepContext} />

              {discoveries.length > 0 ? (
                <GuideSection title="発見教材" meta={`${discoveries.length} 件`}>
                  <ul className="flex flex-col gap-1.5">
                    {discoveries.map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => setOpenDiscoveryId(d.id)}
                          title={d.description}
                          className="flex w-full items-start gap-2 rounded-lg border border-brand/40 bg-brand-soft px-3 py-2 text-left hover:border-brand"
                        >
                          <Sparkles size={12} className="mt-0.5 shrink-0 text-brand" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12.5px] font-medium leading-snug">
                              {d.title}
                            </span>
                            <span className="mt-0.5 block text-[10.5px] text-ink-3">
                              {nodeById.get(d.stage_id)?.title ?? "ステージ"} の脇で発見 ·{" "}
                              {d.question_count} 問{d.passed ? " · 合格済み" : ""}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </GuideSection>
              ) : null}

              {stageQueue.queue.length > 0 ? (
                <StageQueuePanel
                  queue={stageQueue.queue}
                  stageById={stageById}
                  onReorder={(ids) => void stageQueue.reorder(ids).catch(() => undefined)}
                  onRemove={(id) => void stageQueue.remove(id).catch(() => undefined)}
                  onStart={requestStart}
                />
              ) : null}

              {hofInvited ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  <HallOfFameInviteRow kind={hofInvited} />
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setPage("records")}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left hover:bg-sunken"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sunken text-ink-2">
                  <TrendingUp size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-medium">学習の記録</span>
                  <span className="block text-[11px] text-ink-3">
                    学習のペース・学習時間・提出と添削・お知らせ
                  </span>
                </span>
                <ChevronRight size={14} className="text-ink-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* 畳んでいても取得の失敗は見えるようにする (中身は開いたカードに出す)。 */}
            {errors.length > 0 ? (
              <div role="alert" className="border-b border-border bg-warning-soft">
                <button
                  type="button"
                  onClick={() => setExpandedPref(true)}
                  className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[11.5px] text-ink-2"
                >
                  <AlertTriangle size={12} className="shrink-0 text-warning" />
                  読み込めなかった情報があります。開いて確認してください。
                </button>
              </div>
            ) : null}
            <NextStepBar
              guide={guide}
              loading={loadingMap}
              onExpand={() => setExpandedPref(true)}
              {...stepContext}
            />
          </>
        )}
      </aside>

      <SkillCheckDialog
        stageId={checkStageId}
        stageTitle={nodeById.get(checkStageId ?? "")?.title ?? "このステージ"}
        onClose={() => setCheckStageId(null)}
        onFinished={handleSkillCheckFinished}
      />

      {/* 発見教材の受験。閉じたらマップを引き直して合格の印と XP を更新する。 */}
      <DiscoveryDialog
        discoveryId={openDiscoveryId}
        discoveryTitle={openDiscoveryTitle}
        onClose={() => {
          setOpenDiscoveryId(null);
          void skillMap.refetch();
        }}
        onFinished={() => undefined}
      />

      {/* 乗り換えの確認。「1 つに絞る」設計なので、黙って切り替えない。 */}
      <Dialog
        open={pendingStageId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingStageId(null);
        }}
      >
        <DialogContent className="w-[min(calc(100vw-2rem),460px)]">
          <DialogHeader>
            <DialogTitle>進めるステージを切り替えますか?</DialogTitle>
            <DialogDescription>
              「{activeStage?.title}」を一時停止して「
              {(pendingStageId && nodeById.get(pendingStageId)?.title) ?? "選んだステージ"}
              」に切り替えます。進捗はそのまま残り、いつでも戻せます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="default" onClick={() => setPendingStageId(null)}>
              やめる
            </Button>
            <Button variant="accent" onClick={confirmSwitch}>
              切り替える
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/** 盤面と同じ面の上に、読み込み中 / エラー / 未接続の文言を置く (白いカードが出ない)。 */
function BoardMessage({ children }: { children: ReactNode }) {
  return (
    <div className="tree-board flex h-full w-full flex-wrap items-center justify-center gap-3 px-4 text-center text-[12.5px]">
      {children}
    </div>
  );
}
