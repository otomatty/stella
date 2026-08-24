import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  Download,
  FileText,
  Folder,
  Clock,
  ListTree,
  Loader2,
  User,
  X,
} from "@/lib/icons";
import type { Course, Section, Lesson } from "@/data/types";
import type { ChatContext } from "@falcon/shared/ai/types";
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
import { TopbarSlot } from "@/components/shell/TopbarSlot";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { LessonTypeIcon, LessonStatusIcon, lessonTypeLabel } from "./CourseDetail";
import { LessonCompleteCallout, LessonNavFooter } from "./LessonNav";
import { VideoViewer } from "./VideoViewer";
import { resolveLessonStatus } from "@/lib/lesson-progress";
import type { LessonProgressMap } from "@/lib/lesson-progress";
import { resolveLessonNeighbors } from "@/lib/lesson-navigation";
import {
  useLessonProgress,
  useLessonProgressMap,
  useProgressReady,
  useStudyTime,
} from "@/hooks/useLessonProgress";
import { useLessonMaterials } from "@/hooks/useLessonMaterials";
import { useIsNarrowViewport } from "@/hooks/useIsNarrowViewport";
import { downloadLessonMaterial } from "@/lib/cms-api";
import type { LessonMaterialRow } from "@falcon/shared/cms/types";
import { isBackendConfigured } from "@/lib/backend";
import { cn } from "@/lib/utils";
import { AssignmentSubmitPanel } from "./AssignmentSubmitPanel";
import { CodeLessonHandoff } from "./CodeLessonHandoff";
import { LessonMarkdown, MarkdownSlides } from "./MarkdownSlides";
import { QuizPlayer } from "./QuizPlayer";
import type { Tenant } from "@/data/types";

const SlidesViewer = lazy(() =>
  import("./SlidesViewer").then((m) => ({ default: m.SlidesViewer })),
);

interface LessonPlayerProps {
  course: Course;
  setPage: (page: string) => void;
  tenantId: Tenant["id"];
  studentName: string;
  studentInitials: string;
  /**
   * 外から指定された開始レッスン (「続きから」・ シラバスの行クリック・ 検索パレット・
   * リロード復帰)。 指定が無ければ従来どおりコース先頭のレッスンを開く。
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
  onActiveLessonChange?: (courseId: string, lessonId: string) => void;
  /** AIChatBot を開くトリガ。 親が渡す。 */
  onOpenAIBot?: () => void;
  /** レッスンの文脈を AIChatBot に伝えるための setter。 */
  setAIContext?: (ctx: ChatContext) => void;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const LessonPlayer = ({
  course,
  setPage,
  tenantId,
  studentName,
  studentInitials,
  initialLesson = null,
  onActiveLessonChange,
  setAIContext,
}: LessonPlayerProps) => {
  const sections: Section[] = course.sections ?? [];
  const allLessons = useMemo(() => sections.flatMap((s) => s.lessons), [sections]);
  const [activeLesson, setActiveLesson] = useState<string>(
    () => allLessons.find((l) => l.id === initialLesson?.id)?.id ?? allLessons[0]?.id ?? "",
  );
  const [tab, setTab] = useState("content");

  // 適用済みの「外からの選択」を id:seq で覚えておく。 これによりサイドバー操作は
  // 上書きせず、 同じレッスンを選び直した場合 (seq が変わる) には再適用できる。
  //
  // 初期値は null。 マウント時点の選択を「適用済み」にすると、 コース取得が終わる前に
  // マウントしたとき (リロード復帰) に上の useState が対象を見つけられず、 その後
  // コースが届いても再適用されずコース先頭に落ちてしまう。
  const selectionKey = initialLesson ? `${initialLesson.id}:${initialLesson.seq}` : null;
  const appliedSelectionRef = useRef<string | null>(null);

  const progressMap = useLessonProgressMap();

  const completedLessonCount = useMemo(
    () => allLessons.filter((l) => resolveLessonStatus(l, progressMap) === "done").length,
    [allLessons, progressMap],
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

  // 表示レッスンの解決。 「検索での選択の適用」と「コース切替時の先頭寄せ」を
  // 1 つの効果にまとめている。 別々の効果にすると、 別コースのレッスンを検索から
  // 選んだとき (course と initialLesson が同時に変わる) に同一コミット内で
  // 後者が古い activeLesson を見て先頭レッスンに上書きしてしまうため。
  useEffect(() => {
    if (allLessons.length === 0) {
      if (activeLesson !== "") setActiveLesson("");
      return;
    }
    // 1. 未適用の検索選択を最優先で反映する。 現在のコースにまだ含まれていない
    //    (コース prop の反映待ち) 場合は適用済みにせず次のレンダーへ持ち越す。
    if (selectionKey && appliedSelectionRef.current !== selectionKey) {
      const selected = allLessons.find((l) => l.id === initialLesson?.id);
      if (selected) {
        appliedSelectionRef.current = selectionKey;
        if (selected.id !== activeLesson) setActiveLesson(selected.id);
        return;
      }
    }
    // 2. コース切替等で activeLesson が現コースに無ければ先頭に揃える。
    if (!allLessons.some((l) => l.id === activeLesson)) {
      const first = allLessons[0];
      if (first) setActiveLesson(first.id);
    }
  }, [allLessons, activeLesson, initialLesson, selectionKey]);

  // 表示中のレッスンを親へ伝える (リロード後の復帰位置になる)。
  useEffect(() => {
    if (lessonObj) onActiveLessonChange?.(course.id, lessonObj.id);
  }, [course.id, lessonObj, onActiveLessonChange]);

  const activeSectionIndex = useMemo(() => {
    if (!lessonObj) return 0;
    const idx = sections.findIndex((s) => s.lessons.some((l) => l.id === lessonObj.id));
    return idx >= 0 ? idx : 0;
  }, [sections, lessonObj]);

  const activeSection = sections[activeSectionIndex] ?? sections[0];
  const lessonIndexInSection =
    activeSection && lessonObj ? activeSection.lessons.findIndex((l) => l.id === lessonObj.id) : 0;

  // lessonObj が無いコースでも hook 順序を保つため空文字を渡す (内部で no-op)
  const { markComplete } = useLessonProgress(lessonObj?.id ?? "");
  const handleMarkComplete = () => {
    if (lessonObj) markComplete();
  };

  // 滞在時間を学習時間として積む。 動画は VideoViewer が実再生秒数を記録するので除外
  // (両方が同じ watched_sec を書くと二重計上になる)。
  useStudyTime(lessonObj?.id ?? "", Boolean(lessonObj) && lessonObj?.type !== "video");

  // 前後のレッスン (Issue #77 の「前へ」もここに集約)。 locked はスキップして
  // 手前 / 先の解禁レッスンを探す。 無ければ null で、 ナビは端の表示になる。
  const neighbors = useMemo(
    () => resolveLessonNeighbors(course, activeLesson, progressMap),
    [course, activeLesson, progressMap],
  );

  /**
   * ナビ / CTA からのレッスン移動。 切替時に先頭へ戻さないと、 長いレッスンの
   * 末尾で「次へ」を押したとき次のレッスンの途中にスクロールしたまま始まる。
   */
  const goToLesson = useCallback((lessonId: string) => {
    setActiveLesson(lessonId);
    window.scrollTo({ top: 0 });
  }, []);

  const handleBackToCourse = useCallback(() => setPage("course-detail"), [setPage]);

  const nextLessonId = neighbors.next?.lesson.id ?? null;
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
  const activeCompleted = activeLesson ? progressMap[activeLesson]?.completed === true : false;
  const completionWatchRef = useRef<{ lessonId: string; wasCompleted: boolean } | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [calloutDismissed, setCalloutDismissed] = useState(false);

  useEffect(() => {
    if (!activeLesson || !progressReady) {
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
  }, [activeLesson, activeCompleted, progressReady]);

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

  // レッスン切替で AI コンテキストを更新する。code レッスンも含め kind: 'lesson'。
  const lessonId = lessonObj?.id;
  const lessonTitle = lessonObj?.title;
  useEffect(() => {
    if (!setAIContext || lessonId === undefined || lessonTitle === undefined) return;
    setAIContext({
      kind: "lesson",
      lessonTitle,
      courseTitle: course.title,
    });
  }, [lessonId, lessonTitle, course.title, setAIContext]);

  if (!lessonObj) {
    return <div className="p-10 text-sm text-ink-3">このコースにはレッスンがありません。</div>;
  }

  const isQuiz = lessonObj.type === "quiz";
  const isCode = lessonObj.type === "code";
  const isAssignment = lessonObj.type === "assignment";
  const isText = lessonObj.type === "text";
  const isVideo = lessonObj.type === "video";
  const isSlides = lessonObj.type === "slides";

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
        <aside className="border-r border-border bg-card py-4 overflow-y-auto sticky top-[var(--shell-header-height)] max-h-[calc(100vh-var(--shell-header-height))]">
          <LessonToc
            course={course}
            sections={sections}
            progressPercent={progressPercent}
            progressMap={progressMap}
            activeLesson={activeLesson}
            onSelectLesson={goToLesson}
            onBackToCourse={handleBackToCourse}
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
          title="レッスンの目次"
          aria-label="レッスンの目次を開く"
          aria-haspopup="dialog"
          aria-expanded={tocOpen}
        >
          {/* 隣のハンバーガー (Menu) と紛れないよう、 横線だけのアイコンは避ける。 */}
          <ListTree size={18} />
        </button>
      </TopbarSlot>

      <Drawer open={tocOpen} onOpenChange={setTocOpen}>
        {/* 中身は常設パネルと同じ LessonToc。 コース名はその先頭に出るので、
            ヘッダは見出しと閉じるボタンだけに絞る。 */}
        <DrawerContent
          direction="left"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            // 開くボタンは DrawerTrigger ではなく portal 先の button なので、 Radix の
            // 既定復帰に任せず自分で戻す (AIChatBot の FAB と同じ扱い)。
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
          <div className="flex-1 overflow-y-auto py-3">
            <LessonToc
              course={course}
              sections={sections}
              progressPercent={progressPercent}
              progressMap={progressMap}
              activeLesson={activeLesson}
              onSelectLesson={(lessonId) => {
                goToLesson(lessonId);
                setTocOpen(false);
              }}
              onBackToCourse={() => {
                setTocOpen(false);
                handleBackToCourse();
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <main className="min-w-0 flex flex-col">
        {isCode && lessonObj.assignmentId ? (
          <CodeLessonHandoff
            courseId={course.id}
            lessonId={lessonObj.id}
            assignmentTitle={lessonObj.title}
          />
        ) : (
          <>
            {isVideo ? (
              lessonObj.videoPath ? (
                <VideoViewer
                  key={lessonObj.id}
                  lessonId={lessonObj.id}
                  videoPath={lessonObj.videoPath}
                  totalSec={lessonObj.totalSec}
                  onComplete={handleMarkComplete}
                  nextLessonTitle={neighbors.next?.lesson.title ?? null}
                  // 次が無いコース末尾では渡さない。 渡すと VideoViewer 側の
                  // canAdvance が true になり、 何もしないオーバーレイが出る。
                  onAdvanceNext={nextLessonId ? handleAdvanceNext : undefined}
                />
              ) : (
                <MissingMaterialFallback type="video" />
              )
            ) : null}

            {/* markdown を持つスライドは教材タブの MarkdownSlides で描画するので、 上の PDF 枠は出さない。 */}
            {isSlides && !lessonObj.markdown ? (
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
                      <LessonTypeIcon type={lessonObj.type} size={10} />
                      {lessonTypeLabel[lessonObj.type]}
                    </Badge>
                    <span className="text-[11.5px] text-ink-3">
                      {activeSection ? activeSection.title : ""} · {lessonIndexInSection + 1} /{" "}
                      {activeSection ? activeSection.lessons.length : 0}
                    </span>
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
                    {/* 講師名 (courses.instructor_name)。 未設定のコースでは何も出さない。 */}
                    {course.enrolledBy ? (
                      <span className="flex items-center gap-1">
                        <User size={12} /> {course.enrolledBy}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="content" icon={<FileText />}>
                    教材
                  </TabsTrigger>
                  {/* ロード中は 0 と誤解されないよう件数バッジを出さない */}
                  <TabsTrigger
                    value="resources"
                    icon={<Folder />}
                    count={materialsLoading ? undefined : materials.length}
                  >
                    資料
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content">
                  {isQuiz ? (
                    <QuizPlayer lessonId={lessonObj.id} onComplete={handleMarkComplete} />
                  ) : isAssignment ? (
                    <AssignmentSubmitPanel
                      tenantId={tenantId}
                      course={course}
                      lesson={lessonObj}
                      sectionTitle={activeSection?.title}
                      studentName={studentName}
                      studentInitials={studentInitials}
                      onSubmitted={handleMarkComplete}
                    />
                  ) : isText ? (
                    <LessonReadable lesson={lessonObj} onComplete={handleMarkComplete} />
                  ) : isSlides && lessonObj.markdown ? (
                    <MarkdownSlides
                      key={lessonObj.id}
                      lessonId={lessonObj.id}
                      markdown={lessonObj.markdown}
                      header={course.title}
                      onComplete={handleMarkComplete}
                    />
                  ) : isVideo || isSlides ? (
                    <LessonOverview lesson={lessonObj} onComplete={handleMarkComplete} />
                  ) : (
                    <LessonReadable lesson={lessonObj} onComplete={handleMarkComplete} />
                  )}
                </TabsContent>
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

        {/* 完了の CTA と前後ナビはレッスンの種類を問わず本文の最後に出す。 コーディング
            課題 (VS Code へ渡すだけの画面) にも同じ導線が要るので、 上の分岐の外に置く。

            ページ末尾はこのブロックなので、 下端に重なる固定要素のクリアランスもここが持つ。
            pb-24 (96px) は右下の AI FAB (bottom-6 + h-12 = 下端から 72px) ぶん。 小テストは
            解答中の sm 未満に下部固定バー (約 100px + safe-area) が出るので、 その間だけ
            pb-36 (144px) へ広げる (採点後は余白が 48px 余るが、 末尾の余白なので害はない)。 */}
        <div
          className={cn(
            "px-4 sm:px-10 max-w-[880px] mx-auto w-full",
            isQuiz ? "pb-36 sm:pb-24" : "pb-24",
          )}
        >
          {showCompleteCallout ? (
            <LessonCompleteCallout
              neighbors={neighbors}
              onSelectLesson={goToLesson}
              onBackToCourse={handleBackToCourse}
              onDismiss={() => setCalloutDismissed(true)}
            />
          ) : null}
          <LessonNavFooter
            neighbors={neighbors}
            onSelectLesson={goToLesson}
            onBackToCourse={handleBackToCourse}
          />
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
  course,
  sections,
  progressPercent,
  progressMap,
  activeLesson,
  onSelectLesson,
  onBackToCourse,
}: {
  course: Course;
  sections: Section[];
  progressPercent: number;
  progressMap: LessonProgressMap;
  activeLesson: string;
  onSelectLesson: (lessonId: string) => void;
  onBackToCourse: () => void;
}) => (
  <>
    <div className="px-[18px] pb-3.5 border-b border-border mb-2">
      <button
        type="button"
        onClick={onBackToCourse}
        className="flex w-full items-center gap-1 text-[11.5px] text-ink-3 mb-2 hover:text-sf-magenta min-w-0"
      >
        <ChevronLeft size={12} className="shrink-0" />
        <span className="truncate">{course.title}</span>
      </button>
      <div className="text-sm font-semibold leading-snug">進捗</div>
      <div className="text-[11.5px] text-ink-3 mt-1.5">
        <strong className="text-ink font-display text-[13px] font-bold">{progressPercent}%</strong>{" "}
        · セクション {sections.length}
      </div>
      <Progress value={progressPercent} tone="brand" className="mt-2 h-1.5" />
    </div>

    {sections.map((s) => {
      const doneCount = s.lessons.filter(
        (l) => resolveLessonStatus(l, progressMap) === "done",
      ).length;
      return (
        <div key={s.id} className="py-2.5">
          <div className="px-[18px] py-2 font-display text-[10.5px] font-bold text-ink-3 uppercase tracking-[0.14em] flex items-center gap-1.5">
            <span>{s.title}</span>
            <span className="ml-auto text-[11px] font-normal text-ink-3">
              {doneCount}/{s.lessons.length}
            </span>
          </div>
          {s.lessons.map((l) => {
            const isActive = l.id === activeLesson;
            const status = resolveLessonStatus(l, progressMap);
            return (
              <button
                type="button"
                key={l.id}
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
                      ? "text-ink-4 cursor-not-allowed border-transparent"
                      : "text-ink-2 hover:bg-sunken hover:text-foreground border-transparent",
                )}
              >
                <span className="shrink-0 mt-0.5 text-ink-3">
                  {isActive ? (
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-sf-magenta mt-1 ml-[3px] animate-lms-pulse" />
                  ) : (
                    <LessonStatusIcon status={status} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{l.title}</div>
                  <div className="text-ink-3 text-[11px] font-normal mt-0.5 flex items-center gap-1">
                    <LessonTypeIcon type={l.type} size={10} />
                    <span>{l.duration}</span>
                    {isActive && l.progress !== undefined ? (
                      <>
                        <span>·</span>
                        <span>進捗 {l.progress}%</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      );
    })}
  </>
);

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
        の素材がまだアップロードされていません。 講師がアップロード次第、 ここに表示されます。
      </div>
    </div>
  </div>
);

const LessonOverview = ({ lesson, onComplete }: { lesson: Lesson; onComplete: () => void }) => {
  const { entry } = useLessonProgress(lesson.id);
  const isCompleted = entry?.completed === true;
  const hasMaterial =
    (lesson.type === "video" && Boolean(lesson.videoPath)) ||
    (lesson.type === "slides" && Boolean(lesson.pdfPath));
  const materialLabel = lesson.type === "video" ? "動画" : "スライド";
  return (
    <div className="prose-lms">
      <h2>このレッスンについて</h2>
      {hasMaterial ? (
        <p>
          上の{materialLabel}で学習を進めてください。
          {lesson.type === "video"
            ? " 視聴秒数の90%に到達すると自動的に完了マークが付きます。"
            : " ページ全体の90%を閲覧すると自動的に完了マークが付きます。"}
        </p>
      ) : (
        <p>
          {materialLabel}
          素材はまだ準備中です。 アップロードされ次第、 ここから視聴できるようになります。
        </p>
      )}
      {hasMaterial ? (
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
 * 本文が未登録のレッスンではサンプルではなく準備中の空状態を表示する。
 *
 * 画像パスは R2 のオブジェクトキーで入っているので、 `LessonMarkdown` が公開 URL へ解決する。
 *
 * 完了判定はスライドの「90% 閲覧」に対応させて、 **本文の末尾まで到達したら自動完了**
 * とする。 開いた時点で進捗行も作る (作らないと、 完了ボタンを押すまでサイドバーで
 * 「読みかけ」に見えず、 「続きから」の遷移先もこのレッスンを飛ばしてしまう)。
 */
const LessonReadable = ({ lesson, onComplete }: { lesson: Lesson; onComplete: () => void }) => {
  const { entry, markVisited } = useLessonProgress(lesson.id);
  const endRef = useRef<HTMLDivElement>(null);
  const isCompleted = entry?.completed === true;

  useEffect(() => {
    markVisited();
  }, [markVisited]);

  useEffect(() => {
    const el = endRef.current;
    if (!el || isCompleted || !lesson.markdown) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) onComplete();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isCompleted, lesson.markdown, onComplete]);

  return (
    <div className="prose-lms">
      {lesson.markdown ? (
        <LessonMarkdown>{lesson.markdown}</LessonMarkdown>
      ) : (
        <div className="py-10 text-center text-[12.5px] text-ink-3">
          <div className="text-[13.5px] font-semibold text-ink-1 mb-1.5">本文を準備中です</div>
          このレッスンの本文はまだ登録されていません。 講師が登録次第、 ここに表示されます。
        </div>
      )}

      <div ref={endRef} aria-hidden="true" />
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
          このレッスンに配布資料が追加されると、 ここからダウンロードできます。
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
