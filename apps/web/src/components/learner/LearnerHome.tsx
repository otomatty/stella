/**
 * 受講者のホーム — ステージ一覧の盤面と 2 枚のカード。
 *
 * 盤面が画面いっぱいに広がり、「あなたの状況」と「次にやること」の
 * カードがその上に浮かぶ。PC では左上に縦に並べ、スマホ・タブレットでは上端と下端に出す。
 * 表示の切り替えはスマホ・タブレットでは「あなたの状況」のすぐ下に置く。
 * PC ではカードの陰を盤面の「見えている範囲」から外す (`insetLeft`)。
 *
 * ## 前の版から変えたこと
 *
 * - ホームは今日の一手だけを残す。提出と添削はレッスン画面、お知らせは通知から確認する
 * - 縦一本の「スキルマップ」(StagePath) はやめた。同じ星を 2 つの描き方で見せると、
 *   どちらが本物の現在地か迷う。サーバの現在地は盤面の脈打つ星に出す
 * - 現在地がないときは、ガイドに限り案内されたステージの開始・続き・仕上げを出す
 * - プレースメント (初回の案内) はガイドの最初の手順になった。ツリーが横に見えている
 *   ので「あとで選ぶ」で閉じる必要が無い
 *
 * 何をどの順でガイドに並べるかは `@/lib/home-guide` (純関数) が決める。
 */

import { useFirstSteps } from "@/hooks/useFirstSteps";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { nebulaCaption } from "@/components/learner/tree/nebula-caption";

import { Button } from "@/components/ui/button";
import type { Stage } from "@/data/types";
import { useGuidedStages } from "@/hooks/useGuidedStages";
import { useLessonProgressMap } from "@/hooks/useLessonProgress";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMySubmissions } from "@/hooks/useMySubmissions";
import { useSkillMap } from "@/hooks/useSkillMap";
import { useIsHandheld } from "@/hooks/useIsHandheld";
import { useSrsToday } from "@/hooks/useSrsToday";
import { useStageWrapup } from "@/hooks/useStageWrapup";
import { DiscoveryDialog } from "@/components/learner/discovery/DiscoveryDialog";
import { HomeHud } from "@/components/learner/home/HomeHud";
import {
  GuideSection,
  LaterSteps,
  NextStepCard,
  type GuideActiveStage,
  type GuideHandlers,
} from "@/components/learner/home/NextStep";
import { UnlockNotice } from "@/components/learner/home/UnlockNotice";
import {
  SkillTree,
  type ActiveStarInfo,
  type SkillTreeHandle,
} from "@/components/learner/tree/SkillTree";
import { SkillLanes } from "@/components/learner/tree/SkillLanes";
import { startDestination } from "@/components/learner/tree/start-destination";
import { isDevModeEnabled, revealsDevMap, subscribeDevMode } from "@/lib/dev-mode";
import {
  buildHomeGuide,
  homeGuideStageInput,
  isGuidedStageStep,
  pickGuidedStage,
} from "@/lib/home-guide";
import { Compass, ListTree, Sparkles } from "@/lib/icons";
import { findNextLesson, loadMap, whenProgressReady } from "@/lib/lesson-progress";
import { startStage as startGuidedStage } from "@/lib/skill-map-api";
import { buildTodayPlan } from "@/lib/today-plan";
import { cn } from "@/lib/utils";
import { openInVscode } from "@/lib/vscode-launch";

/** PC でカードが覆う幅 (左の余白 16px + 幅 360px + 右の余白 16px)。 */
const GUIDE_INSET_PX = 392;
const FLOATING_CARD_CLASS =
  "pointer-events-auto rounded-2xl border border-border bg-card/95 shadow-xl backdrop-blur-md";

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
  const firstSteps = useFirstSteps(undefined, backendEnabled);
  const progressMap = useLessonProgressMap();
  // 取得に失敗すると一覧は空になる (= 「見直す」が黙って消える) ので、失敗も受け取って出す。
  const { submissions, error: submissionsError } = useMySubmissions(true);
  // 「今日の復習」(SRS) の残り問題数。カードが無い/今日ぶんゼロならプランに出さない。
  const { review, error: reviewError } = useSrsToday(currentUserId, backendEnabled);
  const skillMap = useSkillMap(currentUserId, backendEnabled);
  const guided = useGuidedStages(currentUserId);
  const treeRef = useRef<SkillTreeHandle | null>(null);
  const [homeView, setHomeView] = useState<"tree" | "lanes">(() => {
    try {
      return localStorage.getItem("stella_home_view_v1") === "lanes" ? "lanes" : "tree";
    } catch {
      return "tree";
    }
  });
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  useEffect(() => {
    try {
      localStorage.setItem("stella_home_view_v1", homeView);
    } catch {
      // 保存できない環境でも表示は切り替えられる。
    }
  }, [homeView]);

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
  const islandCaption = useCallback((key: string) => nebulaCaption(key, nodes), [nodes]);
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
   * 先頭を当て推量すると、ツリーではまだ鍵の掛かった星 (すべてのステージに登録のある受講者の
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
  // サーバの現在地が null のときだけ、案内された星をガイドの続き・仕上げに使う。
  const pickedGuidedStage = pickGuidedStage(guided.stages, skillMap.map?.active_stage_id);
  const guidedInProgress =
    pickedGuidedStage?.status === "in-progress" ? stageById(pickedGuidedStage.stage_id) : undefined;
  const guidedStage =
    pickedGuidedStage?.status === "available" || guidedInProgress ? pickedGuidedStage : undefined;
  const guideStage = activeStage ?? guidedInProgress;
  // 問題のステップの状態は、通常のレッスン案内にも仕上げにも使う。
  const taskStageId =
    backendEnabled &&
    guideStage &&
    !guideStage.completed &&
    guideStage.format === 2 &&
    guideStage.lessonsCount > 0
      ? guideStage.id
      : null;
  const { problemLessons, wrapup } = useStageWrapup(taskStageId);
  const nextLesson = useMemo(
    () => findNextLesson(guideStage, progressMap, problemLessons),
    [guideStage, progressMap, problemLessons],
  );

  // 直近のつまずき: 添削で「再提出」「不合格」になった一番新しい提出。
  const recentMiss = submissions.find((s) => s.verdict === "resubmit" || s.verdict === "fail");
  const reviewDone = Boolean(review && review.questions.length === 0 && review.answered_today > 0);
  // 受講登録の有無はサーバの集約フラグを使う。星ごとの `enrolled` は霧より先に
  // 付かないので、星の配列で数えると「唯一の登録が 2 歩先」の受講者を取りこぼす。
  // 古い応答のときだけ星から数える。
  const ordinaryGuide = useMemo(
    () => homeGuideStageInput(skillMap.map, nodes),
    [skillMap.map, nodes],
  );
  const hasEnrollment = ordinaryGuide.hasEnrollment;

  const guide = useMemo(() => {
    const plan = buildTodayPlan({
      srsDueCount: review?.questions.length ?? 0,
      activeStage:
        guideStage && nextLesson
          ? {
              stageTitle: guideStage.title,
              nextLessonTitle: nextLesson.lesson.title,
              // 下限は 0 (「残り 0 レッスン」はありうる状態)。
              remainingLessons: Math.max(guideStage.lessonsCount - nextLesson.lessonNumber + 1, 0),
            }
          : null,
      recentMiss: recentMiss ? { title: recentMiss.assignmentTitle, kind: "submission" } : null,
    });
    return buildHomeGuide({
      plan,
      // マップが届く前 (`null`) は「始めている」側に倒す — 初回の案内が一瞬だけ出て
      // 消える瞬きを避ける。
      hasEnrollment: skillMap.map ? hasEnrollment : true,
      hasAnyEnrollment:
        skillMap.map?.has_enrollment ?? nodes.some((node) => node.enrolled === true),
      hasVisibleExtra: ordinaryGuide.hasVisibleExtra,
      activeWithoutLesson: Boolean(guideStage && !guideStage.completed && !nextLesson),
      guidedStage,
      startableStageIds: ordinaryGuide.startableStageIds,
      stageAudienceById: Object.fromEntries(nodes.map((node) => [node.id, node.audience])),
      reviewDone,
      connectedVscode: firstSteps?.items.find((item) => item.key === "connected-vscode")?.done,
      // 受講登録の取得前は hasEnrollment を true に倒すため、準備案内の判定は待つ。
      firstStageStarted: skillMap.map ? firstSteps?.stage_started : undefined,
    });
  }, [
    review,
    guideStage,
    guidedStage,
    nextLesson,
    recentMiss,
    skillMap.map,
    hasEnrollment,
    ordinaryGuide.hasVisibleExtra,
    ordinaryGuide.startableStageIds,
    nodes,
    reviewDone,
    firstSteps,
  ]);
  /** 先頭 (「次にやること」) は `NextStepCard` が `guide` から引く。ここは残りだけ。 */
  const later = guide.steps.slice(1);
  const firstStep = guide.steps[0];
  const firstStageId = firstStep?.kind === "first-stage" ? firstStep.stageId : null;
  const initialGuidedStageId =
    guidedStage && isGuidedStageStep(firstStep, guidedStage) ? guidedStage.stage_id : null;
  const initialGuideStageId = initialGuidedStageId ?? firstStageId;
  const firstStageFocusAttempted = useRef(false);
  const guidedFocusAttempted = useRef(false);
  useEffect(() => {
    const attempted = initialGuidedStageId ? guidedFocusAttempted : firstStageFocusAttempted;
    if (homeView !== "tree" || pendingFocusId || !initialGuideStageId || attempted.current) return;
    // 既存の初期フォーカスは止め、描画後にこの星へ 1 回だけ寄せる。
    // まだ描画前なら、次のフレームで 1 回だけ試し直す。
    let retryFrame: number | undefined;
    const frame = requestAnimationFrame(() => {
      firstStageFocusAttempted.current = true;
      attempted.current = true;
      if (!treeRef.current?.focusStage(initialGuideStageId)) {
        retryFrame = requestAnimationFrame(() => treeRef.current?.focusStage(initialGuideStageId));
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      if (retryFrame !== undefined) cancelAnimationFrame(retryFrame);
    };
  }, [initialGuideStageId, initialGuidedStageId, homeView, pendingFocusId]);

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
  /**
   * 星を始めて、そのまま最初のレッスン (一度始めた星なら続き) を開く (Phase 3b)。
   *
   * 開始 (受講登録) → フォーカス → **一覧の取り直し** → 開くレッスンの決定。
   * 失敗は必ず文字にする — 投げっぱなしにすると画面上は「押しても何も起きない」になる。
   */
  const startStage = (stageId: string) => {
    const seq = ++startSeqRef.current;
    void (async () => {
      try {
        await skillMap.startStage(stageId);
        const nextStages = await refetchStages();
        const title = nodeById.get(stageId)?.title;
        toast.success(`${title ?? "このステージ"} を進行中にしました`);
        // 進捗は **この時点の値** を読む。描画時の値を閉じ込めると、サーバ進捗の
        // 取り込みが決着する前に押した手が古い地図で遷移先を決めてしまい、
        // 途中まで進めてある星を先頭レッスンへ引き戻す。
        await whenProgressReady();
        // 押したあとに画面を離れた / 別の星を押し直したなら、ここでの遷移は捨てる
        // (開始自体は済んでいるので、上のトーストとツリーの現在地に残る)。
        if (!mountedRef.current || seq !== startSeqRef.current) return;
        // 開くレッスンが決まらない星 (準備中のステージなど) はホームに留まる。
        const target = startDestination(nextStages, stageId, loadMap());
        if (target) onOpenLesson(target.stage, target.lessonId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "ステージを始められませんでした");
      }
    })();
  };

  /** ステージ詳細 (レッスン一覧)。受講中の一覧から引くので、登録のある星だけが開ける。 */
  const openStage = (stageId: string) => {
    void navigate({ to: "/stages/$stageId", params: { stageId } });
  };

  const guidedStartPending = useRef(false);
  const [startingGuidedStage, setStartingGuidedStage] = useState(false);
  const [guidedStartError, setGuidedStartError] = useState<{
    stageId: string;
    message: string;
  } | null>(null);
  const startFromGuide = async (stageId: string) => {
    if (guidedStartPending.current) return;
    guidedStartPending.current = true;
    setStartingGuidedStage(true);
    setGuidedStartError(null);
    const seq = ++startSeqRef.current;
    try {
      await startGuidedStage(stageId);
      const [nextStages] = await Promise.all([
        refetchStages(),
        guided.refetch(),
        skillMap.refetch(),
      ]);
      await whenProgressReady();
      if (!mountedRef.current || seq !== startSeqRef.current) return;
      const target = startDestination(nextStages, stageId, loadMap());
      if (target) onOpenLesson(target.stage, target.lessonId);
      else openStage(stageId);
    } catch (err) {
      setGuidedStartError({
        stageId,
        message: err instanceof Error ? err.message : "開始に失敗しました",
      });
    } finally {
      guidedStartPending.current = false;
      setStartingGuidedStage(false);
    }
  };

  /** その星の続き (未完了の先頭、無ければ読み返しの先頭) を開く。開けなければ詳細へ。 */
  const resumeStage = (stageId: string) => {
    if (activeStage?.id === stageId && problemLessons.size > 0) {
      const lessonId = nextLesson?.lesson.id ?? wrapup?.nextLesson?.id;
      if (lessonId) {
        onOpenLesson(activeStage, lessonId);
        return;
      }
    }
    const target = startDestination(stages, stageId, progressMap);
    if (target) onOpenLesson(target.stage, target.lessonId);
    else openStage(stageId);
  };

  /**
   * 残っている課題に取り組む。パソコンではそのまま VS Code で開く (拡張が課題を準備して
   * 課題文を出す。拡張が無ければ VS Code がインストールを尋ねる)。スマートフォン・
   * タブレットでは VS Code を開けないので、課題文のレッスン (リンクをパソコンへ送るボタンが
   * ある) へ。課題文のレッスンを持たない課題は、課題の一覧があるステージ詳細へ。
   */
  const handheld = useIsHandheld();
  const openPendingTask = () => {
    if (!guideStage || !wrapup) return;
    if (wrapup.nextLesson) {
      onOpenLesson(guideStage, wrapup.nextLesson.id);
      return;
    }
    if (!handheld) {
      void openInVscode({ taskId: wrapup.task.id });
      return;
    }
    const lessonId = wrapup.task.lessonId;
    if (lessonId) onOpenLesson(guideStage, lessonId);
    else openStage(guideStage.id);
  };

  const showInTree = (stageId: string) => {
    if (homeView === "lanes") {
      firstStageFocusAttempted.current = true;
      guidedFocusAttempted.current = true;
      setPendingFocusId(stageId);
      setHomeView("tree");
      return;
    }
    if (!treeRef.current?.focusStage(stageId)) {
      toast("このステージはまだステージ一覧に表示されていません");
    }
  };

  const handlers: GuideHandlers = {
    onStartStage: startStage,
    onStartReview: () => setPage("daily-review"),
    onResumeLesson: () => {
      if (guideStage && nextLesson) onOpenLesson(guideStage, nextLesson.lesson.id);
    },
    onOpenMiss: () => {
      if (recentMiss) onOpenSubmission(recentMiss.id);
    },
    onOpenActiveStage: () => {
      if (guideStage) openStage(guideStage.id);
    },
    onOpenPendingTask: openPendingTask,
    onShowInTree: showInTree,
  };
  const guideActiveStage: GuideActiveStage | null = guideStage
    ? {
        id: guideStage.id,
        title: guideStage.title,
        progress: guideStage.progress,
        lessonsCount: guideStage.lessonsCount,
        wrapup,
      }
    : null;
  const stepContext = {
    ...handlers,
    activeStage: guideActiveStage,
    nodeOf: (id: string) => nodeById.get(id),
    onStartGuidedStage: startFromGuide,
    startingGuidedStage,
    guidedStartError,
  };

  /** 進行中の星の詳細カードに足す情報。 */
  const activeInfo: ActiveStarInfo | null =
    activeStage && !activeStage.completed
      ? {
          progress: activeStage.progress,
          detail: nextLesson
            ? `次は「${nextLesson.lesson.title}」`
            : wrapup
              ? // 課題が残っている (レッスンの 100% はクリアではない)。
                wrapup.detail
              : activeStage.lessonsCount === 0
                ? "教材の準備中です。"
                : "教材はすべて終わりました。課題とレビューの結果を確かめましょう。",
          ...(!nextLesson && wrapup?.learnerTurn && !wrapup.nextLesson
            ? { openTask: openPendingTask }
            : {}),
        }
      : null;

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

  /** 失敗は黙って捨てない (切り替え・取得)。 */
  const errors = [
    stagesError ? `ステージの取得に失敗しました: ${stagesError}` : null,
    reviewError ? `今日の復習の取得に失敗しました: ${reviewError}` : null,
    submissionsError ? `提出履歴の取得に失敗しました: ${submissionsError}` : null,
    skillMap.error && nodes.length > 0
      ? `ステージ一覧の更新に失敗しました: ${skillMap.error}`
      : null,
  ].filter((e): e is string => e !== null);

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const loadingMap = backendEnabled && skillMap.map === null && !skillMap.error;

  // 切り替え先の盤面と視界が描かれてから、控えていた星へ一度だけ寄せる。
  useEffect(() => {
    if (
      homeView !== "tree" ||
      !pendingFocusId ||
      !backendEnabled ||
      loadingMap ||
      (nodes.length === 0 && (skillMap.loading || skillMap.error))
    )
      return;
    const frame = requestAnimationFrame(() => {
      if (!treeRef.current?.focusStage(pendingFocusId)) {
        toast("このステージはまだステージ一覧に表示されていません");
      }
      setPendingFocusId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [
    homeView,
    pendingFocusId,
    backendEnabled,
    loadingMap,
    nodes,
    skillMap.loading,
    skillMap.error,
  ]);

  const showViewToggle =
    backendEnabled && !loadingMap && !(nodes.length === 0 && (skillMap.loading || skillMap.error));

  const boardRef = useRef<HTMLDivElement>(null);
  const topControlsRef = useRef<HTMLDivElement>(null);
  const [chipsTop, setChipsTop] = useState<number>();
  useLayoutEffect(() => {
    const board = boardRef.current;
    const controls = topControlsRef.current;
    if (isDesktop || !showViewToggle || !board || !controls) return;

    const measure = () => {
      setChipsTop(controls.getBoundingClientRect().bottom - board.getBoundingClientRect().top + 8);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(measure);
    observer.observe(controls);
    return () => observer.disconnect();
  }, [isDesktop, showViewToggle]);

  return (
    <div className="relative h-[calc(100dvh-var(--shell-header-height))] overflow-hidden [container-type:size]">
      <div ref={boardRef} className="tree-board absolute inset-0">
        {!backendEnabled ? (
          <BoardMessage>
            ステージ一覧は実データ（API）に接続しているときだけ表示します。
          </BoardMessage>
        ) : loadingMap || (skillMap.loading && nodes.length === 0) ? (
          <BoardMessage>
            <span role="status" aria-live="polite">
              ステージ一覧を読み込んでいます…
            </span>
          </BoardMessage>
        ) : skillMap.error && nodes.length === 0 ? (
          <BoardMessage>
            <span className="text-danger">{skillMap.error}</span>
            <Button size="sm" variant="ghost" onClick={() => void skillMap.refetch()}>
              再読み込み
            </Button>
          </BoardMessage>
        ) : homeView === "tree" ? (
          <SkillTree
            overview
            nodes={nodes}
            islandCaption={islandCaption}
            currentUserId={currentUserId}
            activeStageId={serverActiveStageId}
            onResumeStage={resumeStage}
            onStartStage={startStage}
            onOpenStage={openStage}
            revealDev={revealDev}
            // ガイドが名指しする星には上の effect で寄せる。
            initialFocusStageId={initialGuideStageId ? null : serverActiveStageId}
            activeInfo={activeInfo}
            handleRef={treeRef}
            // PC でカードの陰は「見えている範囲」から外す。
            insetLeft={isDesktop ? GUIDE_INSET_PX : 0}
            chipsTop={isDesktop ? undefined : chipsTop}
            // 全面なので角丸と枠は要らない。
            className="h-full w-full rounded-none border-0"
          />
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 inset-y-3 z-20 grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_fit-content(45cqh)] gap-2 lg:inset-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-3">
        <div ref={topControlsRef} className="z-10 flex flex-col items-start gap-2">
          <section
            aria-label="あなたの状況"
            className={cn(
              FLOATING_CARD_CLASS,
              "ml-3 flex w-[calc(100%-4.25rem)] shrink-0 flex-col gap-2 px-3 py-2 sm:w-[380px] lg:ml-0 lg:w-full lg:gap-3 lg:p-4",
            )}
          >
            <h1 className="text-[15px] font-semibold tracking-tight max-sm:truncate sm:break-words">
              おかえりなさい、{studentName}さん
            </h1>
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
          </section>

          {showViewToggle ? (
            <fieldset
              aria-label="表示"
              className="pointer-events-auto ml-3 flex h-9 w-max shrink-0 items-center rounded-full border border-border bg-white/[0.86] p-0.5 shadow-sm backdrop-blur-md dark:bg-[rgba(12,14,24,0.78)] lg:absolute lg:left-[376px] lg:top-0 lg:ml-0"
            >
              {(["tree", "lanes"] as const).map((view) => {
                const Icon = view === "tree" ? Compass : ListTree;
                return (
                  <button
                    key={view}
                    type="button"
                    aria-pressed={homeView === view}
                    className={cn(
                      "inline-flex h-full items-center gap-1.5 rounded-full px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                      homeView === view
                        ? "bg-brand text-white dark:bg-[#a78bfa] dark:text-[#0c0e18]"
                        : "text-ink-2 hover:bg-sunken",
                    )}
                    onClick={() => {
                      setPendingFocusId(null);
                      setHomeView(view);
                    }}
                  >
                    <Icon size={14} />
                    {view === "tree" ? "ステージ一覧" : "道のり"}
                  </button>
                );
              })}
            </fieldset>
          ) : null}
        </div>

        {/* スマホ・タブレットでは上下のカードの間で道のりをスクロールする。 */}
        {showViewToggle && homeView === "lanes" ? (
          <SkillLanes
            nodes={nodes}
            islandCaption={islandCaption}
            activeStageId={serverActiveStageId}
            revealDev={revealDev}
            activeInfo={activeInfo}
            insetLeft={isDesktop ? GUIDE_INSET_PX : 0}
            onResumeStage={resumeStage}
            onStartStage={startStage}
            onOpenStage={openStage}
            onShowInTree={showInTree}
            className="pointer-events-auto row-start-2 h-full w-full max-lg:pb-2 max-lg:pt-1 lg:absolute lg:-inset-4 lg:row-auto lg:h-auto lg:w-auto"
          />
        ) : null}

        <aside
          aria-label="次にやること"
          className={cn(
            FLOATING_CARD_CLASS,
            "z-10 row-start-3 ml-3 flex max-h-full min-h-0 w-[calc(100%-6.25rem)] flex-col self-start overflow-hidden sm:w-[380px] lg:col-start-1 lg:row-start-2 lg:ml-0 lg:w-full",
          )}
        >
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
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
          </div>
        </aside>
      </div>

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
