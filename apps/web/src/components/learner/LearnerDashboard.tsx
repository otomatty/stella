/**
 * 受講者のホーム — 「今日の一手 + 道のり」の 1 スクロール (Phase 2)。
 *
 * 上から HUD (レベル / XP / 連続学習 / 集中ボーナス) → 解放通知 → 今日のプラン →
 * **スキルマップ (主役)** → 次にやるリスト、の順。その下に、これまでの記録
 * (提出・添削履歴 / 週間学習時間 / お知らせ / 期限 / AI) を二次セクションとして残す。
 *
 * ## 前の版から変えたこと
 *
 * - 「次に取り組むレッスン」カードは **道の現在地ノードへ融合** した。同じ「続きから」が
 *   画面に 2 つあると、どちらが本筋か分からなくなるため
 * - 「今日の復習」カードは今日のプランの 1 項目になった (復習だけ別枠に置くと、
 *   「今日やること」が 2 か所に分かれる)
 * - 「ステージ進捗一覧」は道と重複するので削除。KPI の「連続学習」も HUD の 🔥 と
 *   同じ数字なので HUD 側に寄せた (完了レッスン / 学習時間の KPI は下に残している)
 *
 * バックエンド未設定 (デモ) では道も HUD も出ない。ダミーの道を描くと「進めたのに
 * 星が点かない」ように見えるので、実データが無いときは何も出さない側に倒す。
 */

import { useMemo, useState } from "react";
import { CheckCircle, Clock, ChevronRight, MessageCircle, Sparkles, TrendingUp } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardActions, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import type { Stage } from "@/data/types";
import type { UseAnnouncementsResult } from "@/hooks/useAnnouncements";
import { useLessonProgressMap } from "@/hooks/useLessonProgress";
import { useMySubmissions } from "@/hooks/useMySubmissions";
import { useSkillMap, useStageQueue } from "@/hooks/useSkillMap";
import { useStudyActivity } from "@/hooks/useStudyActivity";
import { useSrsToday } from "@/hooks/useSrsToday";
import { StudyChart } from "@/components/learner/StudyChart";
import { DiscoveryDialog } from "@/components/learner/discovery/DiscoveryDialog";
import {
  HallOfFameInviteRow,
  useHallOfFameInvite,
} from "@/components/hall-of-fame/HallOfFameInvite";
import { HomeHud } from "@/components/learner/home/HomeHud";
import { PlacementWizard, readPlacementSkipped } from "@/components/learner/home/PlacementWizard";
import { StagePath } from "@/components/learner/home/StagePath";
import { StageQueuePanel } from "@/components/learner/home/StageQueuePanel";
import { TodayPlan } from "@/components/learner/home/TodayPlan";
import { UnlockNotice } from "@/components/learner/home/UnlockNotice";
import { findNextLesson, resolveLessonStatus } from "@/lib/lesson-progress";
import { buildTodayPlan } from "@/lib/today-plan";
import { formatSubmittedAt } from "@/lib/submissions-store";
import { cn } from "@/lib/utils";

interface LearnerDashboardProps {
  setPage: (page: string) => void;
  /** 指定のレッスンでレッスン画面を開く (「続きから学習」)。 */
  onOpenLesson: (stage: Stage, lessonId: string) => void;
  stages: Stage[];
  announcementsHook: UseAnnouncementsResult;
  stagesError: string | null;
  /**
   * 受講中ステージの一覧を取り直す (Phase 3b)。
   *
   * 自己開始で受講登録がその場で増えるので、開始したらこれを呼ぶ。呼ばないと
   * 一覧 (`stages`) に新しい星が入らず、サーバが指す現在地を引けないまま
   * 「進行中のステージが見つかりません」の案内が出てしまう。
   */
  refetchStages: () => Promise<unknown>;
  onOpenSubmission: (submissionId: string) => void;
  studentName: string;
  currentUserId: string | null;
  backendEnabled: boolean;
}

/** ISO 文字列を「M月D日」表記にする。 不正値は空文字。 */
function formatAnnouncementDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 秒数を「H:MM」表記にする。 */
function formatHoursMinutes(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

const NEW_WINDOW_MS = 7 * 86_400_000;

/** 週間学習チャートの表示日数 (受け入れ基準の「直近14日」)。 */
const STUDY_ACTIVITY_DAYS = 14;

export const LearnerDashboard = ({
  setPage,
  onOpenLesson,
  stages,
  announcementsHook,
  stagesError,
  refetchStages,
  onOpenSubmission,
  studentName,
  currentUserId,
  backendEnabled,
}: LearnerDashboardProps) => {
  const progressMap = useLessonProgressMap();
  const {
    submissions,
    loading: submissionsLoading,
    error: submissionsError,
  } = useMySubmissions(true);
  // 週間チャート / ストリークは日別学習ログ (study_activity) の実データから出す。
  const {
    activity,
    loading: activityLoading,
    error: activityError,
  } = useStudyActivity(currentUserId, STUDY_ACTIVITY_DAYS, backendEnabled);
  // 「今日の復習」(SRS) の残り問題数。 カードが無い/今日ぶんゼロなら出さない。
  const { review, error: reviewError } = useSrsToday(currentUserId, backendEnabled);
  // スキルマップと HUD (スキルプロフィール)、そして次にやるリスト。
  const skillMap = useSkillMap(currentUserId, backendEnabled);
  const stageQueue = useStageQueue(currentUserId, backendEnabled);

  const stageById = useMemo(() => {
    const map = new Map(stages.map((s) => [s.id, s]));
    return (id: string) => map.get(id);
  }, [stages]);

  /**
   * いま進める星。**サーバの学習フォーカスをそのまま採る**。
   *
   * サーバが星を指しているのに自分のステージ一覧から引けない (割当が外れた等) とき、
   * 別の星に読み替えない — 道に描く「現在地」と「続きから」がずれ、押した先が
   * サーバの言う進行中と違う星になるため。その場合は現在地なしで描き、道の上部に
   * フォーカスを外す導線を出す (`focusLost`)。
   *
   * サーバがそもそも星を持たない (導出も空) / バックエンド未設定のときだけ、
   * 受講中の先頭 → 未着手の先頭という従来の当て推量に落とす。
   */
  const serverActiveStageId = skillMap.map?.active_stage_id ?? null;
  const serverActiveStage = serverActiveStageId ? stageById(serverActiveStageId) : undefined;
  const focusLost = Boolean(serverActiveStageId) && !serverActiveStage;
  const fallbackStage =
    stages.find((c) => !c.completed && c.progress > 0) ??
    stages.find((c) => !c.completed && (c.sections?.length ?? 0) > 0);
  const activeStage = serverActiveStageId ? serverActiveStage : fallbackStage;
  const nextLesson = useMemo(
    () => findNextLesson(activeStage, progressMap),
    [activeStage, progressMap],
  );
  /** 再開先が決まらない (受講ステージ無し / 全完了) ときはステージ一覧へ逃がす。 */
  const resume = () => {
    if (activeStage && nextLesson) onOpenLesson(activeStage, nextLesson.lesson.id);
    else setPage("stages");
  };

  // 直近のつまずき: 添削で「再提出」「不合格」になった一番新しい提出。
  // TODO(skill-map-phase3): つまずきには **不合格だった確認テスト** も並べたい
  // (`buildTodayPlan` は `kind: "quiz"` を既に受け付ける)。学習者自身の
  // `quiz_attempts` を返す API が今は無く、そのためだけに skill-profile や
  // レッスン系の応答を膨らませるのは大げさなので、腕試しの実装フェーズで
  // 「自分の不合格クイズ」を返す口ができたときにここへ繋ぐ。
  const recentMiss = submissions.find((s) => s.verdict === "resubmit" || s.verdict === "fail");
  const plan = useMemo(
    () =>
      buildTodayPlan({
        srsDueCount: review?.questions.length ?? 0,
        activeStage:
          activeStage && nextLesson
            ? {
                stageTitle: activeStage.title,
                nextLessonTitle: nextLesson.lesson.title,
                // 下限は 0 (「残り 0 レッスン」はありうる状態)。1 に切り上げると、
                // 全部終わっている星に「残り 1」と書いてしまう。
                remainingLessons: Math.max(
                  activeStage.lessonsCount - nextLesson.lessonNumber + 1,
                  0,
                ),
              }
            : null,
        recentMiss: recentMiss
          ? { title: recentMiss.assignmentTitle, kind: "submission" as const }
          : null,
      }),
    [review, activeStage, nextLesson, recentMiss],
  );

  /**
   * 切り替え / 解除の失敗を出す場所。
   *
   * `useSkillMap.setActiveStage` は失敗をそのまま投げる (キューの Hook と違い
   * 自分では抱えない) ので、投げっぱなしにすると未処理の rejection になって
   * 画面上は「押しても何も起きない」になる。ここで受けて必ず文字にする。
   */
  const [focusError, setFocusError] = useState<string | null>(null);
  const runFocus = (op: () => Promise<unknown>) => {
    setFocusError(null);
    void op().catch((err: unknown) =>
      setFocusError(err instanceof Error ? err.message : "ステージの切り替えに失敗しました"),
    );
  };
  /**
   * 星を始める一連の処理。開始 → フォーカス → **一覧とキューの取り直し**。
   *
   * 一覧 (`stages`) はレッスンの中身と「続きから」の解決に使うので、開始した星が
   * 入るまで取り直す。ここを忘れると、始めた直後だけ現在地を見失う。
   *
   * **失敗は投げたまま返す**。押した場所ごとに出し先が違う (道やキューからは上の
   * `focusError`、プレースメントはカードの中) ので、ここでは握り潰さない。
   */
  const startStageFlow = async (stageId: string) => {
    await skillMap.startStage(stageId);
    await Promise.all([refetchStages(), stageQueue.refetch()]);
  };
  const runStart = (stageId: string) => runFocus(() => startStageFlow(stageId));
  /** キュー操作の失敗は Hook が `stageQueue.error` に積む (下で出している)。 */
  const runQueue = (op: () => Promise<unknown>) => {
    void op().catch(() => undefined);
  };

  /**
   * 星を始める (Phase 3b)。
   *
   * 受講登録は押した時点で自分で作られるので、割り当ての有無で分岐しない
   * (`useSkillMap.startStage` が開始 → フォーカスの順に投げる)。ただし **既に進めて
   * いる星がある場合は乗り換えの確認を挟む** — 「1 つに絞る」設計なので黙って
   * 切り替えない。
   */
  const [pendingStageId, setPendingStageId] = useState<string | null>(null);
  const requestStart = (stageId: string) => {
    if (activeStage && activeStage.id !== stageId) {
      setPendingStageId(stageId);
      return;
    }
    runStart(stageId);
  };
  const confirmSwitch = () => {
    if (!pendingStageId) return;
    const target = pendingStageId;
    setPendingStageId(null);
    runStart(target);
  };

  /**
   * プレースメント (初回オンボーディング) を出すか。
   *
   * 判定材料は **サーバ状態だけ** — 受講登録が 1 件も無ければ出す。「表示済みか」を
   * ブラウザに覚えさせると端末を変えた初回利用者に出なくなるので、覚えるのは
   * 「あとで選ぶ」を押したことだけ (`readPlacementSkipped`)。記憶は利用者ごとなので、
   * id が後から分かる場合も取り直す (共用端末で前の人のスキップを引き継がない)。
   *
   * マップを読み終える前は出さない (`skillMap.map` が null の間は判断材料が無く、
   * 一瞬だけウィザードが出てすぐ消える瞬きになる)。
   */
  const [placementSkipped, setPlacementSkipped] = useState(false);
  const skipRemembered = useMemo(() => readPlacementSkipped(currentUserId), [currentUserId]);
  // 受講登録の有無はサーバの集約フラグを使う。星ごとの `enrolled` は霧より先に
  // 付かないので、星の配列で数えると「唯一の登録が 2 歩先」の受講者を取りこぼし、
  // 始めているのにプレースメントが出てしまう。古い応答のときだけ星から数える。
  const hasAnyEnrollment =
    skillMap.map?.has_enrollment ??
    (skillMap.map?.stages ?? []).some((node) => node.enrolled === true);
  const showPlacement =
    backendEnabled &&
    skillMap.map !== null &&
    !hasAnyEnrollment &&
    !placementSkipped &&
    !skipRemembered;

  /**
   * 発見教材 (Phase 4)。**サーバが公開条件で絞ったものをそのまま描く**。
   *
   * 受験ダイアログを閉じたらマップを引き直す — 合格の印 (`passed`) と XP は
   * サーバの再取得で更新する (画面側で先回りして書き換えない)。
   */
  const discoveries = skillMap.map?.discoveries ?? [];
  const [openDiscoveryId, setOpenDiscoveryId] = useState<string | null>(null);
  const openDiscoveryTitle =
    discoveries.find((d) => d.id === openDiscoveryId)?.title ?? "発見した教材";

  /** 道の上で「もう開いている」星 (解放通知の比較対象)。 */
  const openStageIds = useMemo(
    () =>
      (skillMap.map?.stages ?? [])
        .filter((n) => n.state !== "locked" && n.visibility !== "fog")
        .map((n) => n.id),
    [skillMap.map],
  );
  const titleOfStage = useMemo(() => {
    const map = new Map((skillMap.map?.stages ?? []).map((n) => [n.id, n.title]));
    return (id: string) => map.get(id) ?? stageById(id)?.title;
  }, [skillMap.map, stageById]);

  // 進捗 KPI はレッスン進捗ストア (バックエンド設定時はサーバ同期済み) から集計する。
  const allLessons = useMemo(
    () => stages.flatMap((c) => c.sections?.flatMap((s) => s.lessons) ?? []),
    [stages],
  );
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter(
    (l) => resolveLessonStatus(l, progressMap) === "done",
  ).length;
  const totalWatchedSec = allLessons.reduce(
    (sum, l) => sum + (progressMap[l.id]?.watchedSec ?? 0),
    0,
  );

  // 前日比: 累計の完了レッスン数は「今日完了した数」だけ前日から増えるので、
  // 日別学習ログ (study_activity) の今日の completed_lessons を昨日からの増分として出す。
  const todayCompletedLessons = activity
    ? (activity.days.find((d) => d.date === activity.today)?.completed_lessons ?? 0)
    : null;
  // 今日の学習時間 (秒)。 「今日どれだけ進んだか」を見せてモチベーションにつなげる。
  const todaySec = activity?.today_sec ?? null;
  const completedTrend = !activity ? (
    activityLoading ? (
      <Skeleton className="h-3 w-24" />
    ) : undefined
  ) : todayCompletedLessons != null && todayCompletedLessons > 0 ? (
    <>
      <TrendingUp size={12} />
      昨日から +{todayCompletedLessons} レッスン
    </>
  ) : (
    <>昨日から ±0 · 今日の1本目を始めよう</>
  );
  const studyTimeTrend = !activity ? (
    activityLoading ? (
      <Skeleton className="h-3 w-24" />
    ) : (
      "動画視聴の合計"
    )
  ) : todaySec != null && todaySec > 0 ? (
    <>
      <TrendingUp size={12} />
      今日 {formatHoursMinutes(todaySec)}
    </>
  ) : (
    <>今日はまだ 0:00</>
  );

  const { announcements, error: announcementsError, refetch } = announcementsHook;
  // 殿堂への招待 (Phase 5)。届いていない人には何も出ない。
  const hofInvited = useHallOfFameInvite(backendEnabled);
  const now = Date.now();
  const newCount = announcements.reduce(
    (n, a) => n + (now - new Date(a.published_at).getTime() < NEW_WINDOW_MS ? 1 : 0),
    0,
  );

  // 期限が近い課題は enrollment の dueAt から実データで組み立てる。
  // 該当が無ければサンプルではなく空状態を表示する (誤情報を出さない)。
  const deadlines = stages
    .filter((c): c is Stage & { dueAt: string } => Boolean(c.dueAt) && !c.completed)
    .sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1))
    .slice(0, 5)
    .flatMap((c) => {
      // due_at は UTC 午前0時で保存される。 new Date(...) で UTC インスタンスを
      // ローカル日付に変換すると UTC より西の TZ で日付が 1 日ずれるため、
      // 日付部分 (YYYY-MM-DD) を date-only として扱って差分を取る。
      const [y, m, d] = c.dueAt.slice(0, 10).split("-").map(Number);
      if (y === undefined || m === undefined || d === undefined) return [];
      const dueUTC = Date.UTC(y, m - 1, d);
      const today = new Date();
      const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
      const days = Math.round((dueUTC - todayUTC) / 86_400_000);
      return [
        {
          id: c.id,
          t: c.title,
          due: days < 0 ? "期限超過" : days === 0 ? "本日まで" : `${days}日後`,
          c: c.required ? "必須" : c.category,
          urgency: (days <= 3 ? "warning" : "info") as "warning" | "info",
        },
      ];
    });

  const pendingStage = pendingStageId ? stageById(pendingStageId) : undefined;

  return (
    <>
      <PageHeader
        title={`おかえりなさい、${studentName}さん`}
        sub={
          <>
            今日も学習を続けましょう。完了レッスン{" "}
            <strong className="text-foreground">
              {completedLessons}/{totalLessons}
            </strong>
            {todayCompletedLessons != null && todayCompletedLessons > 0 ? (
              <span className="text-success"> · 今日 +{todayCompletedLessons}</span>
            ) : null}
          </>
        }
      />

      {stagesError ? (
        <p className="text-sm text-destructive mb-3">ステージの取得に失敗しました: {stagesError}</p>
      ) : null}
      {announcementsError ? (
        <div className="flex items-center gap-3 mb-3">
          <p className="text-sm text-destructive">
            お知らせの取得に失敗しました: {announcementsError}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            再試行
          </Button>
        </div>
      ) : null}
      {/* 取得失敗を握り潰すと「復習機能が無い」ように見えるため、 他のエラーと同じトーンで出す。 */}
      {reviewError ? (
        <p className="text-sm text-destructive mb-3">
          今日の復習の取得に失敗しました: {reviewError}
        </p>
      ) : null}
      {skillMap.error ? (
        <p className="text-sm text-destructive mb-3">
          スキルマップの取得に失敗しました: {skillMap.error}
        </p>
      ) : null}
      {/* キューと切り替えの失敗も黙って捨てない (ステージ一覧と同じ流儀)。 */}
      {stageQueue.error ? (
        <p className="text-sm text-destructive mb-3">
          次にやるリストの更新に失敗しました: {stageQueue.error}
        </p>
      ) : null}
      {focusError ? (
        <p className="text-sm text-destructive mb-3">
          進めるステージの切り替えに失敗しました: {focusError}
        </p>
      ) : null}

      {backendEnabled ? (
        <HomeHud
          profile={skillMap.profile}
          focusBonus={skillMap.map?.focus_bonus ?? null}
          streakDays={activity?.current_streak ?? null}
          loading={skillMap.loading}
          className="mb-4"
        />
      ) : null}

      {showPlacement ? (
        <PlacementWizard
          nodes={skillMap.map?.stages ?? []}
          nextStageIds={skillMap.map?.next_stage_ids ?? []}
          // 何も始めていない状態なので乗り換えの確認は要らない。そのまま開始する。
          // 失敗はカードの中に出したいので、握り潰さない側 (`startStageFlow`) を渡す。
          onStart={startStageFlow}
          onOpenTree={() => setPage("skill-tree")}
          onSkip={() => setPlacementSkipped(true)}
          userId={currentUserId}
          className="mb-4"
        />
      ) : null}

      <UnlockNotice
        openStageIds={openStageIds}
        titleOf={titleOfStage}
        ready={Boolean(skillMap.map)}
        // 自分で切り替えた現在地は「新しく開いた星」ではない。
        activeStageId={serverActiveStageId}
        discoveries={discoveries}
        // 記憶は利用者ごと (共有端末で前の人の「見た」を引き継がない)。
        userId={currentUserId}
        className="mb-4"
      />

      <div className="flex flex-col gap-4 mb-8">
        <TodayPlan
          plan={plan}
          reviewDone={Boolean(review && review.questions.length === 0 && review.answered_today > 0)}
          onStartReview={() => setPage("daily-review")}
          onStartLesson={resume}
          onOpenMiss={() => (recentMiss ? onOpenSubmission(recentMiss.id) : setPage("stages"))}
        />

        {backendEnabled ? (
          <StagePath
            nodes={skillMap.map?.stages ?? []}
            nextStageIds={skillMap.map?.next_stage_ids ?? []}
            onOpenTree={() => setPage("skill-tree")}
            // 現在地はサーバの値がそのまま正 (引けなければ現在地なしで描く)。
            activeStageId={serverActiveStageId}
            resume={
              activeStage && nextLesson
                ? { lessonTitle: `次は「${nextLesson.lesson.title}」`, onResume: resume }
                : undefined
            }
            activeProgress={activeStage?.progress ?? 0}
            onStartStage={requestStart}
            onQueueStage={(id) => runQueue(() => stageQueue.add(id))}
            queuedStageIds={stageQueue.queue}
            discoveries={discoveries}
            onOpenDiscovery={setOpenDiscoveryId}
            focusLost={
              focusLost
                ? { onClear: () => runFocus(() => skillMap.setActiveStage(null)) }
                : undefined
            }
          />
        ) : null}

        {backendEnabled ? (
          <StageQueuePanel
            queue={stageQueue.queue}
            stageById={stageById}
            onReorder={(ids) => runQueue(() => stageQueue.reorder(ids))}
            onRemove={(id) => runQueue(() => stageQueue.remove(id))}
            onStart={requestStart}
          />
        ) : null}
      </div>

      {/* ここから下は「これまでの記録」。今日の行動には直結しないので道の下に置く。 */}
      <div className="grid gap-3 mb-6 grid-cols-1 sm:grid-cols-2">
        <KpiCard
          label={
            <>
              <CheckCircle size={12} /> 完了レッスン
            </>
          }
          value={completedLessons}
          unit={`/ ${totalLessons}`}
          trend={completedTrend}
          {...(todayCompletedLessons != null && todayCompletedLessons > 0
            ? { trendDir: "up" as const }
            : {})}
        >
          <Progress
            value={totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}
            className="mt-2"
            tone="brand"
          />
        </KpiCard>
        <KpiCard
          label={
            <>
              <Clock size={12} /> 学習時間
            </>
          }
          value={formatHoursMinutes(totalWatchedSec)}
          unit="累計"
          trend={studyTimeTrend}
          {...(todaySec != null && todaySec > 0 ? { trendDir: "up" as const } : {})}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>提出・添削履歴</CardTitle>
            </CardHeader>
            <div>
              {submissionsLoading ? <SkeletonRows rows={3} className="px-4 py-4" /> : null}
              {submissionsError ? (
                <div className="px-4 py-3 text-[12.5px] text-destructive">
                  提出履歴の取得に失敗しました: {submissionsError}
                </div>
              ) : null}
              {!submissionsLoading && !submissionsError && submissions.length === 0 ? (
                <div className="px-4 py-4 text-[12.5px] text-ink-3">提出はまだありません。</div>
              ) : null}
              {submissions.map((submission, i) => {
                const meta = submission.verdict
                  ? SUBMISSION_META[submission.verdict]
                  : SUBMISSION_META.pending;
                return (
                  <button
                    type="button"
                    key={submission.id}
                    onClick={() => onOpenSubmission(submission.id)}
                    className={cn(
                      "w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-sunken",
                      i < submissions.length - 1 ? "border-b border-border" : "",
                    )}
                  >
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium">{submission.assignmentTitle}</div>
                      <div className="text-[11.5px] text-ink-3">
                        {submission.stageTitle} · {formatSubmittedAt(submission.submittedAt)}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-ink-4" />
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>週間学習時間</CardTitle>
              <CardActions>
                <span className="text-[11.5px] text-ink-3">
                  直近{STUDY_ACTIVITY_DAYS}日
                  {activity ? ` · 合計 ${formatHoursMinutes(activity.total_sec)}` : ""}
                </span>
              </CardActions>
            </CardHeader>
            {activityError ? (
              <div className="px-4 py-4 text-[12.5px] text-destructive">
                学習ログの取得に失敗しました: {activityError}
              </div>
            ) : activityLoading && !activity ? (
              <div className="p-4 h-60">
                <Skeleton className="h-full w-full" />
              </div>
            ) : !activity ? (
              <div className="px-4 py-4 text-[12.5px] text-ink-3">
                学習ログはまだありません。レッスンを視聴すると日別の学習時間が記録されます。
              </div>
            ) : activity.total_sec === 0 ? (
              <div className="px-4 py-4 text-[12.5px] text-ink-3">
                直近{STUDY_ACTIVITY_DAYS}日の学習記録はありません。
              </div>
            ) : (
              <div className="p-4 h-60 relative">
                <StudyChart days={activity.days} />
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>お知らせ</CardTitle>
              <CardActions>
                {newCount > 0 ? <Badge variant="accent">{newCount} 新着</Badge> : null}
              </CardActions>
            </CardHeader>
            <div>
              {/* 殿堂への招待は「お知らせ」の先頭に置く。専用のバナーを作らないのは、
                  招待が「運営からの連絡」の一種で、他の連絡と同じ場所で受け取れる方が
                  自然なため (招待が無い人には何も出ない)。 */}
              {hofInvited ? <HallOfFameInviteRow kind={hofInvited} /> : null}
              {announcements.length === 0 && !hofInvited ? (
                <div className="px-4 py-3 text-[12.5px] text-ink-3">お知らせはありません。</div>
              ) : null}
              {announcements.slice(0, 5).map((a, i, arr) => {
                const isNew = now - new Date(a.published_at).getTime() < NEW_WINDOW_MS;
                return (
                  <div
                    key={a.id}
                    className={cn(
                      "flex gap-3 px-4 py-3",
                      i < arr.length - 1 ? "border-b border-border" : "",
                    )}
                  >
                    <div
                      className={cn(
                        "shrink-0 w-2 h-2 rounded-full mt-1.5",
                        isNew ? "bg-brand" : "bg-border-strong",
                      )}
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-[13px] leading-snug">{a.title}</div>
                      {a.body ? (
                        <div className="text-[11.5px] text-ink-2 mt-0.5 line-clamp-2">{a.body}</div>
                      ) : null}
                      <div className="text-[11.5px] text-ink-3 mt-1 flex gap-2">
                        <span>{a.author_name || "お知らせ"}</span>
                        <span>{formatAnnouncementDate(a.published_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>期限が近い課題</CardTitle>
            </CardHeader>
            <div>
              {deadlines.length === 0 ? (
                <div className="px-4 py-3 text-[12.5px] text-ink-3">
                  期限が設定された課題はありません。
                </div>
              ) : null}
              {deadlines.map((d, i) => (
                <div
                  key={d.id}
                  className={cn(
                    "flex gap-3 px-4 py-3",
                    i < deadlines.length - 1 ? "border-b border-border" : "",
                  )}
                >
                  <Badge variant={d.urgency} className="text-[10px]">
                    {d.due}
                  </Badge>
                  <div>
                    <div className="font-medium text-[13px] leading-snug">{d.t}</div>
                    <div className="text-[11.5px] text-ink-3 mt-1">{d.c}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card
            className="bg-gradient-to-br"
            style={{
              background: "linear-gradient(to bottom right, var(--bg-raised), var(--brand-soft))",
            }}
          >
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-md bg-ink text-card grid place-items-center">
                  <Sparkles size={15} />
                </div>
                <div className="text-[13px] font-semibold">学習アシスタントAI</div>
              </div>
              <div className="text-[11.5px] text-ink-2 leading-relaxed">
                教材の内容について質問できます。未解決の時は担当メンターに引き継ぎます。
              </div>
              <Button
                variant="default"
                size="full"
                className="mt-4"
                onClick={() => setPage("__ai")}
              >
                <MessageCircle size={13} />
                質問する
              </Button>
            </CardContent>
          </Card>
        </div>
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
              「{activeStage?.title}」を一時停止して「{pendingStage?.title ?? "選んだステージ"}
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
    </>
  );
};

const SUBMISSION_META = {
  pending: { label: "添削待ち", variant: "info" },
  pass: { label: "合格", variant: "success" },
  resubmit: { label: "再提出", variant: "warning" },
  fail: { label: "不合格", variant: "danger" },
} as const;
