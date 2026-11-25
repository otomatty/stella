import {
  lazy,
  type ReactNode,
  type RefObject,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleDashed,
  Contrast,
  Code,
  Download,
  FileText,
  Folder,
  Clock,
  ListTree,
  Loader2,
  User,
  X,
} from "@/lib/icons";
import type { Stage, Section, Lesson } from "@/data/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { AppShellContext } from "@/components/shell/app-shell-context";
import { TopbarSlot } from "@/components/shell/TopbarSlot";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { LessonTypeIcon, LessonStatusIcon, lessonTypeLabel } from "./StageDetail";
import { LessonCompleteCallout, LessonNavFooter } from "./LessonNav";
import { LessonComments } from "./LessonComments";
import { SlideLessonMedia } from "./SlideLessonMedia";
import { VideoViewer } from "./VideoViewer";
import { resolveLessonStatus } from "@/lib/lesson-progress";
import type { LessonProgressMap } from "@/lib/lesson-progress";
import {
  isLessonTocSectionOpen,
  type LessonTocOverrides,
  resolveLessonTocSection,
  setAllLessonTocSectionsOpen,
  summarizeLessonTocSections,
} from "@/lib/lesson-toc-sections";
import { resolveLessonNeighbors } from "@/lib/lesson-navigation";
import { displayLessonType, isVideoLesson, nextLessonMeta } from "@/lib/lesson-video";
import {
  useLessonProgress,
  useLessonProgressMap,
  useProgressReady,
  useStudyTime,
} from "@/hooks/useLessonProgress";
import { useStageTasks } from "@/hooks/useStageTasks";
import { lessonSubmissionTarget } from "@/lib/lesson-submissions";
import {
  firstOpenProblem,
  type ProblemLesson,
  problemLessonsById,
  problemLockReason,
} from "@/lib/problem-lesson";
import { useVideoLessonComments } from "@/hooks/useLessonComments";
import { useLessonMaterials } from "@/hooks/useLessonMaterials";
import { useIsNarrowViewport } from "@/hooks/useIsNarrowViewport";
import { downloadLessonMaterial } from "@/lib/cms-api";
import type { LessonMaterialRow } from "@stella/shared/cms/types";
import { isBackendConfigured } from "@/lib/backend";
import { cn } from "@/lib/utils";
import { AssignmentSubmitPanel } from "./AssignmentSubmitPanel";
import { CodeLessonHandoff } from "./CodeLessonHandoff";
import { ProblemLessonHandoff, TaskLessonHandoff } from "./TaskLessonHandoff";
import { SubmissionHistory } from "./SubmissionHistory";
import { LessonMarkdown, MarkdownSlides } from "./MarkdownSlides";
import { QuizPlayer } from "./QuizPlayer";
const SlidesViewer = lazy(() =>
  import("./SlidesViewer").then((m) => ({ default: m.SlidesViewer })),
);

interface LessonPlayerProps {
  focusThreadId?: string;
  stage: Stage;
  setPage: (page: string) => void;
  studentName: string;
  studentInitials: string;
  /**
   * 外から指定された開始レッスン (「続きから」・ シラバスの行クリック・ 検索パレット・
   * リロード復帰)。 指定が無ければ従来どおりステージ先頭のレッスンを開く。
   *
   * `seq` は選択のたびに増える版番号。 「検索で A → サイドバーで B → 再び検索で A」
   * のように同じレッスンを選び直したときも、 id だけでは変化を検出できず反映
   * されないため、 版番号で「明示的に選ばれた」ことを伝える。
   */
  initialLesson?: { id: string; seq: number } | null;
  /**
   * 表示中のレッスンが変わったときの通知。 親はこれを受講位置として控え、
   * リロード後に同じレッスンへ戻す。
   */
  onActiveLessonChange?: (stageId: string, lessonId: string) => void;
  onOpenSubmission: (submissionId: string) => void;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const LessonPlayer = ({
  stage,
  setPage,
  studentName,
  studentInitials,
  focusThreadId,
  initialLesson = null,
  onActiveLessonChange,
  onOpenSubmission,
}: LessonPlayerProps) => {
  const sections: Section[] = stage.sections ?? [];
  const allLessons = useMemo(() => sections.flatMap((s) => s.lessons), [sections]);
  const [activeLesson, setActiveLesson] = useState<string>(
    () => allLessons.find((l) => l.id === initialLesson?.id)?.id ?? allLessons[0]?.id ?? "",
  );
  const [tabSelection, setTabSelection] = useState<{ key: string; tab: string }>();
  const [tocStageId, setTocStageId] = useState(stage.id);
  const [tocSectionOverrides, setTocSectionOverrides] = useState<LessonTocOverrides>({});
  const tocAsideRef = useRef<HTMLElement>(null);
  const tocDrawerScrollRef = useRef<HTMLDivElement>(null);

  if (tocStageId !== stage.id) {
    setTocStageId(stage.id);
    setTocSectionOverrides({});
  }

  const shell = useContext(AppShellContext);
  const tasksEnabled = stage.format === 2 && isBackendConfigured();
  const stageTasks = useStageTasks(stage.id, tasksEnabled, true);
  const problemLessons = useMemo(() => problemLessonsById(stageTasks), [stageTasks]);
  const problemLessonIds = useMemo(() => new Set(problemLessons.keys()), [problemLessons]);

  // 適用済みの「外からの選択」を id:seq で覚えておく。 これによりサイドバー操作は
  // 上書きせず、 同じレッスンを選び直した場合 (seq が変わる) には再適用できる。
  //
  // 初期値は null。 マウント時点の選択を「適用済み」にすると、 ステージ取得が終わる前に
  // マウントしたとき (リロード復帰) に上の useState が対象を見つけられず、 その後
  // ステージが届いても再適用されずステージ先頭に落ちてしまう。
  const selectionKey = initialLesson ? `${initialLesson.id}:${initialLesson.seq}` : null;
  const appliedSelectionRef = useRef<string | null>(null);

  const progressMap = useLessonProgressMap();

  const completedLessonCount = useMemo(
    () =>
      allLessons.filter((l) => resolveLessonStatus(l, progressMap, problemLessons) === "done")
        .length,
    [allLessons, progressMap, problemLessons],
  );
  const progressPercent = allLessons.length
    ? Math.round((completedLessonCount / allLessons.length) * 100)
    : 0;

  const lessonObj: Lesson | undefined = useMemo(
    () => allLessons.find((l) => l.id === activeLesson) ?? allLessons[0],
    [allLessons, activeLesson],
  );

  // 配布資料は CMS の実体レッスン (uuid) のみ取得する (fixtures は空状態のまま)。
  const materialsEnabled = isBackendConfigured() && UUID_RE.test(lessonObj?.id ?? "");
  const {
    materials,
    loading: materialsLoading,
    error: materialsError,
  } = useLessonMaterials(lessonObj?.id ?? null, materialsEnabled);

  const lessonId = lessonObj?.id ?? "";
  const problemLesson = problemLessons.get(lessonId);
  // 課題一覧が取れるまで、問題のステップかもしれないテキストの完了を送らない。
  const trackTextProgress = !problemLesson && (!tasksEnabled || stageTasks != null);
  const showVideo = Boolean(lessonObj && isVideoLesson(lessonObj));
  const threadFromRoute = lessonId === initialLesson?.id ? focusThreadId : undefined;
  const video = useVideoLessonComments(
    lessonId,
    showVideo && materialsEnabled,
    lessonObj?.videoPath,
    threadFromRoute,
  );
  const tabKey = JSON.stringify([lessonId, threadFromRoute]);
  const tab = tabSelection?.key === tabKey ? tabSelection.tab : showVideo ? "comments" : "content";
  useEffect(() => {
    setTabSelection((previous) => (previous?.key === tabKey ? previous : undefined));
  }, [tabKey]);
  const videoControls = {
    ...video.controls,
    onMarkerSelect: (threadId: string) => {
      setTabSelection({ key: tabKey, tab: "comments" });
      video.comments.revealThread(threadId);
    },
  };

  // 表示レッスンの解決。 「検索での選択の適用」と「ステージ切替時の先頭寄せ」を
  // 1 つの効果にまとめている。 別々の効果にすると、 別ステージのレッスンを検索から
  // 選んだとき (stage と initialLesson が同時に変わる) に同一コミット内で
  // 後者が古い activeLesson を見て先頭レッスンに上書きしてしまうため。
  useEffect(() => {
    if (allLessons.length === 0) {
      if (activeLesson !== "") setActiveLesson("");
      return;
    }
    // 1. 未適用の検索選択を最優先で反映する。 現在のステージにまだ含まれていない
    //    (ステージ prop の反映待ち) 場合は適用済みにせず次のレンダーへ持ち越す。
    if (selectionKey && appliedSelectionRef.current !== selectionKey) {
      const selected = allLessons.find((l) => l.id === initialLesson?.id);
      if (selected) {
        appliedSelectionRef.current = selectionKey;
        if (selected.id !== activeLesson) setActiveLesson(selected.id);
        return;
      }
    }
    // 2. ステージ切替等で activeLesson が現ステージに無ければ先頭に揃える。
    if (!allLessons.some((l) => l.id === activeLesson)) {
      const first = allLessons[0];
      if (first) setActiveLesson(first.id);
    }
  }, [allLessons, activeLesson, initialLesson, selectionKey]);

  // 表示中のレッスンを親へ伝える (リロード後の復帰位置になる)。
  useEffect(() => {
    if (lessonObj) onActiveLessonChange?.(stage.id, lessonObj.id);
  }, [stage.id, lessonObj, onActiveLessonChange]);

  const activeSectionIndex = useMemo(() => {
    if (!lessonObj) return 0;
    const idx = sections.findIndex((s) => s.lessons.some((l) => l.id === lessonObj.id));
    return Math.max(idx, 0);
  }, [sections, lessonObj]);

  const activeSection = sections[activeSectionIndex] ?? sections[0];

  // lessonObj が無いステージでも hook 順序を保つため空文字を渡す (内部で no-op)
  const { markComplete } = useLessonProgress(lessonObj?.id ?? "");
  const handleMarkComplete = () => {
    if (lessonObj) markComplete();
  };

  // 滞在時間を学習時間として積む。 動画レッスンは VideoViewer が実再生秒数を記録するので除外
  // (両方が同じ watched_sec を書くと二重計上になる)。
  useStudyTime(
    lessonId,
    Boolean(lessonObj) &&
      lessonObj?.type !== "video" &&
      (lessonObj?.type !== "text" || trackTextProgress),
  );

  // 前後のレッスン (Issue #77 の「前へ」もここに集約)。 locked はスキップして
  // 手前 / 先の解禁レッスンを探す。 無ければ null で、 ナビは端の表示になる。
  const neighbors = useMemo(
    () => resolveLessonNeighbors(stage, activeLesson, progressMap, problemLessons),
    [stage, activeLesson, progressMap, problemLessons],
  );

  /**
   * ナビ / CTA からのレッスン移動。 切替時に先頭へ戻さないと、 長いレッスンの
   * 末尾で「次へ」を押したとき次のレッスンの途中にスクロールしたまま始まる。
   */
  const goToLesson = useCallback((lessonId: string) => {
    setActiveLesson(lessonId);
    window.scrollTo({ top: 0 });
  }, []);

  const handleBackToStage = useCallback(() => setPage("stage-detail"), [setPage]);

  const nextLesson = neighbors.next?.lesson;
  const nextLessonId = nextLesson?.id ?? null;
  const handleAdvanceNext = useCallback(() => {
    if (nextLessonId) goToLesson(nextLessonId);
  }, [nextLessonId, goToLesson]);

  /**
   * 「このレッスンを見ている間に完了した」 ことの検知。
   *
   * 開いた時点で既に完了しているレッスン (読み返し) では CTA を出さない。
   * 完了の起点は種類ごとに違う (動画の 90% 視聴 / スライドの 90% 閲覧 / テキストの
   * 末尾到達 / 小テストの合格 / 課題の提出 / 拡張からのクリア同期) が、 どれも
   * 最終的に進捗ストアの `completed` を立てるので、 その遷移だけを見れば足りる。
   *
   * ただし基準にできるのはサーバ進捗の取り込みが決着してから (`useProgressReady`)。
   * `hydrateFromRemote` はキャッシュ更新の notify を先に流して最後に ready を立てる
   * ので、 決着前に基準を取ると 「ローカルは空 → サーバの completed が届く」 を
   * 「いま完了した」 と読んでしまう (ログイン直後 / 別端末で完了済み /
   * localStorage を消したあとの読み返しで祝ってしまう)。 ビューア側の復元位置と
   * 同じ扱いに揃える。
   */
  const progressReady = useProgressReady();
  const activeCompleted = problemLesson
    ? problemLesson.problem.state === "submitted"
    : progressMap[activeLesson]?.completed === true;
  const completionReady =
    progressReady && (lessonObj?.type !== "text" || !tasksEnabled || stageTasks != null);
  const completionWatchRef = useRef<{ lessonId: string; wasCompleted: boolean } | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [calloutDismissed, setCalloutDismissed] = useState(false);

  useEffect(() => {
    if (!activeLesson || !completionReady) {
      // 基準を取れないうちは監視しない。 決着後に取り直せるよう捨てておく。
      completionWatchRef.current = null;
      return;
    }
    if (completionWatchRef.current?.lessonId !== activeLesson) {
      completionWatchRef.current = { lessonId: activeLesson, wasCompleted: activeCompleted };
      setJustCompleted(false);
      setCalloutDismissed(false);
      return;
    }
    if (activeCompleted && !completionWatchRef.current.wasCompleted) setJustCompleted(true);
  }, [activeLesson, activeCompleted, completionReady]);

  const showCompleteCallout = justCompleted && !calloutDismissed;

  // lg 未満 (VSCode 拡張のパネル等も含む) では目次をドロワーで開く。 パネル幅の変更で
  // lg 境界を跨いだら常設パネル側に切り替わるので、 ドロワーは閉じておく。
  const isNarrow = useIsNarrowViewport();
  const [tocOpen, setTocOpen] = useState(false);
  // ドロワーを閉じたときのフォーカス復帰先。
  const tocButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!isNarrow) setTocOpen(false);
  }, [isNarrow]);

  if (!lessonObj) {
    return <div className="p-10 text-sm text-ink-3">このステージには教材がありません。</div>;
  }

  const task = stageTasks?.find((task) => task.lessonId === lessonObj.id);
  const taskId = task?.id ?? problemLesson?.taskId ?? null;
  const submissionTarget = lessonSubmissionTarget({
    format: stage.format,
    lesson: lessonObj,
    taskId,
  });

  const isQuiz = lessonObj.type === "quiz";
  const isCode = lessonObj.type === "code";
  const isAssignment = lessonObj.type === "assignment";
  const isText = lessonObj.type === "text";
  const isVideo = lessonObj.type === "video";
  const isSlides = lessonObj.type === "slides";
  const displayType = displayLessonType(lessonObj);
  const problemState = problemLesson?.problem.state;
  const nextMeta = nextLesson
    ? nextLessonMeta(lessonTypeLabel[displayLessonType(nextLesson)], nextLesson.duration)
    : null;

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[280px_1fr]"
      style={{ minHeight: "calc(100vh - var(--shell-header-height))" }}
    >
      {/* このグリッドの直下に置けるのは目次の常設パネルと本文だけ。 TopbarSlot は Topbar へ、
          Drawer は portal 先へ抜けるのでここには DOM を残さない。 列を増やす要素を足すと
          lg:grid-cols-[280px_1fr] の 2 列目に乗って本文が崩れる。 */}
      {/* lg 以上は目次を常設する。 lg 未満は列ごと落として本文を全幅で使い、 目次は
          Topbar から開くドロワーへ寄せる (常設のレールは表示領域を削るので廃止した)。
          CSS で隠すのではなく描画ごと落として、 ドロワーと同時に目次を 2 本持たない。 */}
      {isNarrow ? null : (
        <aside
          ref={tocAsideRef}
          className="border-r border-border bg-card py-4 overflow-y-auto sticky top-[var(--shell-header-height)] max-h-[calc(100vh-var(--shell-header-height))]"
        >
          <LessonToc
            stage={stage}
            sections={sections}
            progressPercent={progressPercent}
            progressMap={progressMap}
            problemLessons={problemLessons}
            activeLesson={lessonObj.id}
            scrollContainer={tocAsideRef}
            overrides={tocSectionOverrides}
            setOverrides={setTocSectionOverrides}
            onSelectLesson={goToLesson}
            onBackToStage={handleBackToStage}
          />
        </aside>
      )}

      {/* 目次を開くボタンは Topbar へ差し込む。 本文の上に何も重ねず、 スクロール位置に
          関係なく開ける。 */}
      <TopbarSlot>
        <button
          ref={tocButtonRef}
          type="button"
          onClick={() => setTocOpen(true)}
          className="lg:hidden w-[34px] h-[34px] shrink-0 rounded-full grid place-items-center text-ink-2 hover:bg-sunken border border-transparent hover:border-border"
          title="教材の目次"
          aria-label="教材の目次を開く"
          aria-haspopup="dialog"
          aria-expanded={tocOpen}
        >
          {/* 隣のハンバーガー (Menu) と紛れないよう、 横線だけのアイコンは避ける。 */}
          <ListTree size={18} />
        </button>
      </TopbarSlot>

      <Drawer open={tocOpen} onOpenChange={setTocOpen}>
        {/* 中身は常設パネルと同じ LessonToc。 ステージ名はその先頭に出るので、
            ヘッダは見出しと閉じるボタンだけに絞る。 */}
        <DrawerContent
          direction="left"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            // 開くボタンは DrawerTrigger ではなく portal 先の button なので、 Radix の
            // 既定復帰に任せず自分で戻す。
            const target = tocButtonRef.current;
            if (target) {
              event.preventDefault();
              target.focus();
            }
          }}
        >
          <DrawerHeader className="flex-row items-center gap-2.5 py-2.5">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-[13px]">目次</DrawerTitle>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon-sm" aria-label="閉じる">
                <X size={14} />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div ref={tocDrawerScrollRef} className="flex-1 overflow-y-auto py-3">
            <LessonToc
              stage={stage}
              sections={sections}
              progressPercent={progressPercent}
              progressMap={progressMap}
              problemLessons={problemLessons}
              activeLesson={lessonObj.id}
              scrollContainer={tocDrawerScrollRef}
              overrides={tocSectionOverrides}
              setOverrides={setTocSectionOverrides}
              onSelectLesson={(lessonId) => {
                goToLesson(lessonId);
                setTocOpen(false);
              }}
              onBackToStage={() => {
                setTocOpen(false);
                handleBackToStage();
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <main
        data-testid="lesson-screen"
        data-lesson-id={lessonObj.id}
        className="min-w-0 flex flex-col"
      >
        {isCode && lessonObj.assignmentId ? (
          <CodeLessonHandoff
            stageId={stage.id}
            lessonId={lessonObj.id}
            assignmentTitle={lessonObj.title}
          />
        ) : (
          <>
            {showVideo && lessonObj.videoPath ? (
              <div ref={video.playerContainer} className="scroll-mt-[var(--shell-header-height)]">
                {isVideo ? (
                  <VideoViewer
                    {...videoControls}
                    key={lessonObj.id}
                    lessonId={lessonObj.id}
                    videoPath={lessonObj.videoPath}
                    totalSec={lessonObj.totalSec}
                    onComplete={handleMarkComplete}
                    nextLessonTitle={nextLesson?.title ?? null}
                    nextLessonMeta={nextMeta}
                    // 次が無いステージ末尾では渡さない。 渡すと VideoViewer 側の
                    // canAdvance が true になり、 何もしないオーバーレイが出る。
                    onAdvanceNext={nextLessonId ? handleAdvanceNext : undefined}
                  />
                ) : (
                  <SlideLessonMedia
                    {...videoControls}
                    key={lessonObj.id}
                    lessonId={lessonObj.id}
                    videoPath={lessonObj.videoPath}
                    onComplete={handleMarkComplete}
                    nextLessonTitle={nextLesson?.title ?? null}
                    nextLessonMeta={nextMeta}
                    onAdvanceNext={nextLessonId ? handleAdvanceNext : undefined}
                  />
                )}
              </div>
            ) : isVideo ? (
              <MissingMaterialFallback type="video" />
            ) : isSlides && !lessonObj.markdown ? (
              lessonObj.pdfPath ? (
                <Suspense fallback={<ViewerLoading />}>
                  <SlidesViewer
                    key={lessonObj.id}
                    lessonId={lessonObj.id}
                    pdfPath={lessonObj.pdfPath}
                    totalPages={lessonObj.totalPages}
                    onComplete={handleMarkComplete}
                  />
                </Suspense>
              ) : (
                <MissingMaterialFallback type="slides" />
              )
            ) : null}

            <div className="px-4 sm:px-10 py-6 max-w-[880px] mx-auto w-full">
              <div className="flex items-start gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Badge
                      variant="accent"
                      className="bg-sf-magenta-soft text-sf-magenta-ink font-bold"
                    >
                      {problemLesson ? (
                        <>
                          <Code size={10} aria-hidden="true" />
                          問題
                        </>
                      ) : (
                        <>
                          <LessonTypeIcon type={displayType} size={10} />
                          {lessonTypeLabel[displayType]}
                        </>
                      )}
                    </Badge>
                    <span className="text-[11.5px] text-ink-3">{activeSection?.title}</span>
                    {showVideo ? (
                      <div className="ml-auto shrink-0">
                        {activeCompleted ? (
                          <span className="inline-flex items-center gap-1 text-xs text-success">
                            <Check size={13} aria-hidden="true" />
                            完了
                          </span>
                        ) : (
                          <Button size="sm" variant="outline" onClick={handleMarkComplete}>
                            完了にする
                          </Button>
                        )}
                      </div>
                    ) : problemState === "open" || problemState === "submitted" ? (
                      <span
                        className={cn(
                          "ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                          problemState === "submitted"
                            ? "bg-success-soft text-success"
                            : "bg-muted text-ink-2",
                        )}
                      >
                        {problemState === "submitted" ? (
                          <>
                            <Check size={13} aria-hidden="true" />
                            {problemLesson?.problem.manual ? "引き継ぎ" : "提出済み"}
                          </>
                        ) : (
                          "未提出"
                        )}
                      </span>
                    ) : null}
                  </div>
                  <h1 className="text-[22px] font-black tracking-[0.01em] leading-[1.3]">
                    {lessonObj.title}
                  </h1>
                  <div className="flex flex-wrap gap-3.5 text-ink-3 text-[12.5px] mb-5 mt-1">
                    {lessonObj.duration ? (
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {lessonObj.duration}
                      </span>
                    ) : null}
                    {/* 講師名 (stages.instructor_name)。 未設定のステージでは何も出さない。 */}
                    {stage.enrolledBy ? (
                      <span className="flex items-center gap-1">
                        <User size={12} /> {stage.enrolledBy}
                      </span>
                    ) : null}
                  </div>
                  {stage.format === 2 && isText && !problemLesson ? (
                    <TaskLessonHandoff
                      taskId={taskId}
                      problemId={firstOpenProblem(task?.problems)?.id}
                    />
                  ) : null}
                </div>
              </div>

              <Tabs value={tab} onValueChange={(tab) => setTabSelection({ key: tabKey, tab })}>
                <TabsList>
                  {showVideo ? (
                    <TabsTrigger
                      value="comments"
                      className="min-h-11 sm:min-h-8"
                      count={
                        video.comments.loading || video.comments.allTotal === undefined
                          ? undefined
                          : video.comments.allTotal + video.comments.orphanedCount
                      }
                    >
                      コメント
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger value="content" icon={<FileText />}>
                      教材
                    </TabsTrigger>
                  )}
                  {/* ロード中は 0 と誤解されないよう件数バッジを出さない */}
                  <TabsTrigger
                    value="resources"
                    className={showVideo ? "min-h-11 sm:min-h-8" : undefined}
                    icon={<Folder />}
                    count={materialsLoading ? undefined : materials.length}
                  >
                    資料
                  </TabsTrigger>
                </TabsList>

                {showVideo ? (
                  <TabsContent value="comments" forceMount className="data-[state=inactive]:hidden">
                    {video.comments.enabled ? (
                      <LessonComments
                        key={lessonId}
                        comments={video.comments}
                        playback={video.playback}
                        getPlaybackState={video.getPlaybackState}
                        onSeek={video.onSeek}
                        onPause={video.onPause}
                        onComposingChange={video.onComposingChange}
                        focusThreadId={threadFromRoute}
                        visible={tab === "comments"}
                        viewer={{
                          id: shell?.currentUserId ?? "",
                          name: studentName,
                          initials: studentInitials,
                          avatarUrl: shell?.profile?.avatar_url,
                        }}
                      />
                    ) : null}
                  </TabsContent>
                ) : (
                  <TabsContent value="content">
                    {isQuiz ? (
                      <>
                        <QuizPlayer lessonId={lessonObj.id} onComplete={handleMarkComplete} />
                        {lessonObj.markdown ? (
                          <div className="mt-6">
                            <LessonMarkdown>{lessonObj.markdown}</LessonMarkdown>
                          </div>
                        ) : null}
                      </>
                    ) : isAssignment && stage.format !== 2 ? (
                      <AssignmentSubmitPanel
                        stage={stage}
                        lesson={lessonObj}
                        sectionTitle={activeSection?.title}
                        studentName={studentName}
                        studentInitials={studentInitials}
                        onSubmitted={handleMarkComplete}
                      />
                    ) : isText ? (
                      <LessonReadable
                        lesson={lessonObj}
                        isProblemLesson={Boolean(problemLesson)}
                        onComplete={trackTextProgress ? handleMarkComplete : undefined}
                        afterContent={
                          problemLesson ? <ProblemLessonHandoff {...problemLesson} /> : null
                        }
                      />
                    ) : isSlides && lessonObj.markdown ? (
                      <MarkdownSlides
                        key={lessonObj.id}
                        lessonId={lessonObj.id}
                        markdown={lessonObj.markdown}
                        header={stage.title}
                        onComplete={handleMarkComplete}
                      />
                    ) : isVideo || isSlides ? (
                      <LessonOverview lesson={lessonObj} onComplete={handleMarkComplete} />
                    ) : (
                      <LessonReadable
                        lesson={lessonObj}
                        isProblemLesson={false}
                        onComplete={handleMarkComplete}
                      />
                    )}
                  </TabsContent>
                )}
                <TabsContent value="resources">
                  <ResourcesList
                    materials={materials}
                    loading={materialsLoading}
                    error={materialsError}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}

        {/* コーディング課題にも末尾ナビを出すため、上の分岐の外に置く。
            完了直後の案内は末尾ナビにまとめ、動画の最後の教材だけ独立した案内を出す。

            ページ末尾はこのブロックなので、 下端に重なる固定要素のクリアランスもここが持つ。
            pb-24 (96px) は右下の開発者モード FAB (bottom-6 + h-12 = 下端から 72px) ぶん。 小テストは
            解答中の sm 未満に下部固定バー (約 100px + safe-area) が出るので、 その間だけ
            pb-36 (144px) へ広げる (採点後は余白が 48px 余るが、 末尾の余白なので害はない)。 */}
        <div
          className={cn(
            "px-4 sm:px-10 max-w-[880px] mx-auto w-full",
            isQuiz ? "pb-36 sm:pb-24" : "pb-24",
          )}
        >
          {submissionTarget ? (
            <SubmissionHistory target={submissionTarget} onOpenSubmission={onOpenSubmission} />
          ) : null}
          {showCompleteCallout && showVideo && neighbors.next === null ? (
            <LessonCompleteCallout
              neighbors={neighbors}
              onSelectLesson={goToLesson}
              onBackToStage={handleBackToStage}
              onDismiss={() => setCalloutDismissed(true)}
            />
          ) : null}
          {!showVideo ? (
            <LessonNavFooter
              neighbors={neighbors}
              onSelectLesson={goToLesson}
              onBackToStage={handleBackToStage}
              justCompleted={showCompleteCallout}
              onDismissCompletion={() => setCalloutDismissed(true)}
              problemLessonIds={problemLessonIds}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
};

/**
 * レッスン一覧 (目次)。 lg 以上では左の常設パネル、 lg 未満では Topbar から開く
 * ドロワーの中身として、 同じものを 2 か所で描く。
 */
const LessonToc = ({
  stage,
  sections,
  progressPercent,
  progressMap,
  problemLessons,
  activeLesson,
  scrollContainer,
  overrides,
  setOverrides,
  onSelectLesson,
  onBackToStage,
}: {
  stage: Stage;
  sections: Section[];
  progressPercent: number;
  progressMap: LessonProgressMap;
  problemLessons: ReadonlyMap<string, ProblemLesson>;
  activeLesson: string;
  scrollContainer: RefObject<HTMLElement | null>;
  overrides: LessonTocOverrides;
  setOverrides: (update: (previous: LessonTocOverrides) => LessonTocOverrides) => void;
  onSelectLesson: (lessonId: string) => void;
  onBackToStage: () => void;
}) => {
  const tocId = useId();
  const sectionStates = sections.map((section) =>
    resolveLessonTocSection(
      section,
      (lesson) => resolveLessonStatus(lesson, progressMap, problemLessons),
      activeLesson,
    ),
  );
  const { done, progress, untouched, allOpen } = summarizeLessonTocSections(
    sectionStates,
    overrides,
  );
  const ToggleAllIcon = allOpen ? ChevronsDownUp : ChevronsUpDown;

  useEffect(() => {
    const container = scrollContainer.current;
    const row = container?.querySelector(`button[data-lesson-id="${CSS.escape(activeLesson)}"]`);
    if (!container || !row) return;

    // 現在の教材がはみ出す分だけ目次を動かし、本文のスクロール位置は保つ。
    const bounds = row.getBoundingClientRect();
    const top = container.getBoundingClientRect().top + container.clientTop;
    const bottom = top + container.clientHeight;
    if (bounds.top < top) {
      container.scrollTop += bounds.top - top;
    } else if (bounds.bottom > bottom) {
      container.scrollTop += bounds.bottom - bottom;
    }
  }, [activeLesson, scrollContainer]);

  return (
    <>
      <div className="px-[18px] pb-3.5 border-b border-border mb-2">
        <button
          type="button"
          onClick={onBackToStage}
          className="flex w-full items-center gap-1 text-[11.5px] text-ink-3 mb-2 hover:text-sf-magenta min-w-0"
        >
          <ChevronLeft size={12} className="shrink-0" />
          <span className="truncate">{stage.title}</span>
        </button>
        <div className="text-sm font-semibold leading-snug">進捗</div>
        <div className="text-[11.5px] text-ink-3 mt-1.5">
          <strong className="text-ink font-display text-[13px] font-bold">
            {progressPercent}%
          </strong>{" "}
          · セクション {sections.length}
        </div>
        <Progress value={progressPercent} tone="brand" className="mt-2 h-1.5" />
      </div>

      <div className="flex items-center justify-between gap-2 px-[18px] py-1 text-[11px] text-ink-3">
        <span>
          完了 {done} · 進行中 {progress} · 未着手 {untouched}
        </span>
        <button
          type="button"
          onClick={() =>
            setOverrides((previous) =>
              setAllLessonTocSectionsOpen(sectionStates, previous, !allOpen),
            )
          }
          className="flex shrink-0 items-center gap-1 rounded-sm hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ToggleAllIcon size={12} aria-hidden="true" />
          {allOpen ? "すべて閉じる" : "すべて開く"}
        </button>
      </div>

      {sectionStates.map((section) => {
        const current = section.status === "current";
        const open = isLessonTocSectionOpen(section, overrides);
        const listId = `${tocId}-${section.id}`;
        const Chevron = open ? ChevronDown : ChevronRight;
        const headerClassName =
          "px-[18px] py-2 font-display text-[10.5px] font-bold text-ink-3 uppercase tracking-[0.14em] flex items-center gap-1.5";
        const heading = (
          <>
            <Chevron
              size={12}
              className={current ? "shrink-0 text-ink-4" : "shrink-0 text-ink-3"}
              aria-hidden="true"
            />
            {section.allDone ? (
              <CheckCircle size={14} className="shrink-0 text-success" aria-hidden="true" />
            ) : section.status === "untouched" ? (
              <CircleDashed size={14} className="shrink-0 text-ink-4" aria-hidden="true" />
            ) : (
              <Contrast
                size={14}
                className={cn("shrink-0 [&_path]:fill-current", current && "text-brand")}
                aria-hidden="true"
              />
            )}
            <span className={cn("truncate", current && "text-foreground")}>{section.title}</span>
            {current ? (
              <span className="shrink-0 text-[10px] font-bold text-brand-ink bg-brand-soft rounded-full px-1.5">
                いまここ
              </span>
            ) : null}
            <span className="ml-auto shrink-0 text-[11px] font-normal text-ink-3">
              {section.doneCount}/{section.lessons.length}
            </span>
          </>
        );

        return (
          <div key={section.id} className="py-2.5">
            {current ? (
              <div className={headerClassName}>{heading}</div>
            ) : (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() =>
                  setOverrides((previous) => ({
                    ...previous,
                    [section.id]: !isLessonTocSectionOpen(section, previous),
                  }))
                }
                className={cn(
                  headerClassName,
                  "w-full text-left hover:bg-sunken focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand",
                )}
              >
                {heading}
              </button>
            )}
            <div id={listId} hidden={!open}>
              {open &&
                section.lessons.map((l) => {
                  const isActive = l.id === activeLesson;
                  const status = resolveLessonStatus(l, progressMap, problemLessons);
                  const lockReason = problemLockReason(problemLessons.get(l.id)?.problem);
                  return (
                    <button
                      type="button"
                      key={l.id}
                      data-testid={`lesson-toc-${l.type}`}
                      data-lesson-id={l.id}
                      onClick={() => {
                        if (status === "locked") return;
                        onSelectLesson(l.id);
                      }}
                      disabled={status === "locked"}
                      className={cn(
                        "w-full flex items-start gap-2.5 px-[18px] py-2 text-[12.5px] border-l-2 text-left",
                        "transition-colors",
                        isActive
                          ? "bg-[rgba(230,47,154,0.05)] text-foreground font-semibold border-sf-magenta"
                          : status === "locked"
                            ? "text-ink-3 cursor-not-allowed border-transparent"
                            : "text-ink-2 hover:bg-sunken hover:text-foreground border-transparent",
                      )}
                    >
                      <span className="shrink-0 mt-0.5 text-ink-3">
                        {isActive && (status === "todo" || !problemLessons.has(l.id)) ? (
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-sf-magenta mt-1 ml-[3px] animate-lms-pulse" />
                        ) : (
                          <LessonStatusIcon status={status} />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{l.title}</div>
                        <div className="text-ink-3 text-[11px] font-normal mt-0.5 flex items-center gap-1">
                          <LessonTypeIcon type={displayLessonType(l)} size={10} />
                          <span>{l.duration}</span>
                          {isActive && l.progress !== undefined ? (
                            <>
                              <span>·</span>
                              <span>進捗 {l.progress}%</span>
                            </>
                          ) : null}
                        </div>
                        {lockReason ? (
                          <div className="mt-1 text-[11px] font-normal text-ink-3">
                            {lockReason}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        );
      })}
    </>
  );
};

const ViewerLoading = () => (
  <div
    role="status"
    aria-busy="true"
    aria-live="polite"
    aria-label="ビューアを読み込み中"
    className="aspect-[16/9] max-h-[62vh]"
  >
    <Skeleton className="h-full w-full rounded-none" />
  </div>
);

const MissingMaterialFallback = ({ type }: { type: "video" | "slides" }) => (
  <div className="aspect-[16/9] max-h-[62vh] grid place-items-center bg-sunken border-b border-border px-6 text-center">
    <div className="max-w-md">
      <div className="text-[13.5px] font-semibold text-ink-1">教材を準備中です</div>
      <div className="text-[12px] text-ink-3 mt-1.5">
        {type === "video" ? "動画" : "スライド"}
        の素材がまだアップロードされていません。 管理者がアップロード次第、 ここに表示されます。
      </div>
    </div>
  </div>
);

const LessonOverview = ({ lesson, onComplete }: { lesson: Lesson; onComplete: () => void }) => {
  const { entry } = useLessonProgress(lesson.id);
  const isCompleted = entry?.completed === true;
  const hasPdf = lesson.type === "slides" && Boolean(lesson.pdfPath);
  const materialLabel = lesson.type === "video" ? "動画" : "スライド";
  return (
    <div className="prose-lms">
      <h2>この教材について</h2>
      {hasPdf ? (
        <p>
          上のスライドで学習を進めてください。{" "}
          ページ全体の90%を閲覧すると自動的に完了マークが付きます。
        </p>
      ) : (
        <p>
          {materialLabel}
          素材はまだ準備中です。 アップロードされ次第、 ここから視聴できるようになります。
        </p>
      )}
      {hasPdf ? (
        <div className="flex gap-2.5 items-center pt-6 border-t border-border mt-8">
          <div className="flex-1" />
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 text-success text-[12px]">
              <Check size={13} aria-hidden="true" />
              完了済み
            </span>
          ) : (
            <Button variant="accent" onClick={onComplete}>
              <Check size={13} aria-hidden="true" />
              完了にする
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
};

/**
 * text レッスンの本文。 CMS (lessons.markdown) の実データを描画する。
 * 問題レッスンは補足がなくても状態カードで進められるため、空本文に準備中の案内を出さない。
 *
 * 画像パスは R2 のオブジェクトキーで入っているので、 `LessonMarkdown` が公開 URL へ解決する。
 *
 * 完了判定はスライドの「90% 閲覧」に対応させて、 **本文の末尾まで到達したら自動完了**
 * とする。 開いた時点で進捗行も作る (作らないと、 完了ボタンを押すまでサイドバーで
 * 「読みかけ」に見えず、 「続きから」の遷移先もこのレッスンを飛ばしてしまう)。
 */
const LessonReadable = ({
  lesson,
  isProblemLesson,
  onComplete,
  afterContent,
}: {
  lesson: Lesson;
  isProblemLesson: boolean;
  onComplete?: () => void;
  afterContent?: ReactNode;
}) => {
  const { entry, markVisited } = useLessonProgress(lesson.id);
  const endRef = useRef<HTMLDivElement>(null);
  const isCompleted = entry?.completed === true;

  const trackProgress = Boolean(onComplete);
  useEffect(() => {
    if (trackProgress) markVisited();
  }, [markVisited, trackProgress]);

  useEffect(() => {
    const el = endRef.current;
    if (!el || !onComplete || isCompleted || !lesson.markdown) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) onComplete();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isCompleted, lesson.markdown, onComplete]);

  return (
    <div data-testid="lesson-doc" className="prose-lms">
      {lesson.markdown ? (
        <LessonMarkdown>{lesson.markdown}</LessonMarkdown>
      ) : isProblemLesson ? null : (
        <div className="py-10 text-center text-[12.5px] text-ink-3">
          <div className="text-[13.5px] font-semibold text-ink-1 mb-1.5">本文を準備中です</div>
          この教材の本文はまだ登録されていません。 管理者が登録次第、 ここに表示されます。
        </div>
      )}

      <div ref={endRef} aria-hidden="true" />
      {onComplete ? (
        <div className="flex gap-2.5 items-center pt-6 border-t border-border mt-8">
          <div className="flex-1" />
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 text-success text-[12px]">
              <Check size={13} aria-hidden="true" />
              完了済み
            </span>
          ) : (
            <Button variant="accent" onClick={onComplete}>
              <Check size={13} aria-hidden="true" />
              完了にする
            </Button>
          )}
        </div>
      ) : (
        afterContent
      )}
    </div>
  );
};

/** ファイルサイズ表記 (1024 基数)。 */
const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/**
 * 資料タブ。 配布資料 (lesson_materials) の実データを一覧し、 API 経由でダウンロードする。
 * 資料が無いレッスンでは空状態を表示する。
 */
const ResourcesList = ({
  materials,
  loading,
  error,
}: {
  materials: LessonMaterialRow[];
  loading: boolean;
  error: string | null;
}) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (material: LessonMaterialRow) => {
    setDownloadingId(material.id);
    try {
      await downloadLessonMaterial(material);
    } catch (err) {
      console.error("[ResourcesList] download failed", err);
      toast.error(err instanceof Error ? err.message : "ダウンロードに失敗しました");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return <SkeletonRows rows={3} className="py-4" />;
  }

  // 取得失敗は「資料なし」と区別して表示する。
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-ink-3">
        <Folder size={28} className="text-ink-4" />
        <div className="font-medium text-danger">配布資料の取得に失敗しました</div>
        <div className="text-[12.5px]">{error}</div>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-ink-3">
        <Folder size={28} className="text-ink-4" />
        <div className="font-medium text-ink-2">配布資料はありません</div>
        <div className="text-[12.5px]">
          この教材に配布資料が追加されると、 ここからダウンロードできます。
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {materials.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-3 rounded-md border border-border bg-card px-3.5 py-2.5"
        >
          <div className="grid place-items-center w-9 h-9 rounded-md bg-sunken text-ink-3 shrink-0">
            <FileText size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium truncate">{m.file_name}</div>
            <div className="text-[11.5px] text-ink-3">{formatBytes(m.size_bytes)}</div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={downloadingId === m.id}
            onClick={() => void handleDownload(m)}
          >
            {downloadingId === m.id ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Download size={13} />
            )}
            ダウンロード
          </Button>
        </div>
      ))}
    </div>
  );
};
