import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Folder,
  MessageCircle,
  Edit,
  Clock,
  Loader2,
  HelpCircle,
  User,
} from '@/lib/icons';
import type { Course, Section, Lesson, LessonType } from '@/data/types';
import type { ChatContext, GradingSummary } from '@falcon/shared/ai/types';
import type { Assignment } from '@falcon/shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { LessonTypeIcon, LessonStatusIcon } from './CourseDetail';
import { VideoViewer } from './VideoViewer';
import { resolveLessonStatus } from '@/lib/lesson-progress';
import {
  useLessonProgress,
  useLessonProgressMap,
  useStudyTime,
} from '@/hooks/useLessonProgress';
import { useLessonNote } from '@/hooks/useLessonNote';
import { MAX_NOTE_LENGTH } from '@falcon/shared/study/notes-sync';
import { useLessonQuestions } from '@/hooks/useQuestions';
import { useLessonMaterials } from '@/hooks/useLessonMaterials';
import { createQuestion, createReply } from '@/lib/qa-api';
import { downloadLessonMaterial } from '@/lib/cms-api';
import type { LessonMaterialRow } from '@falcon/shared/cms/types';
import { isBackendConfigured } from "@/lib/backend";
import { QAThread } from '@/components/common/QAThread';
import { QuestionComposer } from '@/components/common/QuestionComposer';
import type { QuestionWithReplies } from '@falcon/shared/cms/types';
import { cn } from '@/lib/utils';
import { AssignmentSubmitPanel } from './AssignmentSubmitPanel';
import { LessonMarkdown, MarkdownSlides } from './MarkdownSlides';
import { QuizPlayer } from './QuizPlayer';
import type { Tenant } from '@/data/types';

const SlidesViewer = lazy(() =>
  import('./SlidesViewer').then((m) => ({ default: m.SlidesViewer })),
);

// CodeMirror (vendor-codemirror chunk) を含むため、 code レッスンを開くまでロードしない。
const PracticeWorkspace = lazy(() =>
  import('@/practice/PracticeWorkspace').then((m) => ({
    default: m.PracticeWorkspace,
  })),
);

interface LessonPlayerProps {
  course: Course;
  setPage: (page: string) => void;
  tenantId: Tenant['id'];
  studentName: string;
  studentInitials: string;
  /** ログイン中ユーザの ID (Q&A の自己メッセージ判定に使う)。 未ログイン時は null。 */
  currentUserId: string | null;
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
  /** AIChatBot を開くトリガ。 PracticeWorkspace の「AI に質問する」 から呼ぶ。 */
  onOpenAIBot?: () => void;
  /** レッスン (またはコード演習) の文脈を AIChatBot に伝えるための setter。 */
  setAIContext?: (ctx: ChatContext) => void;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const lessonTypeLabel: Record<LessonType, string> = {
  video: '動画',
  slides: 'スライド',
  text: 'テキスト',
  quiz: '小テスト',
  assignment: '課題',
  code: 'コーディング課題',
};

export const LessonPlayer = ({
  course,
  setPage,
  tenantId,
  studentName,
  studentInitials,
  currentUserId,
  initialLesson = null,
  onActiveLessonChange,
  onOpenAIBot,
  setAIContext,
}: LessonPlayerProps) => {
  const sections: Section[] = course.sections ?? [];
  const allLessons = useMemo(() => sections.flatMap((s) => s.lessons), [sections]);
  const [activeLesson, setActiveLesson] = useState<string>(
    () =>
      allLessons.find((l) => l.id === initialLesson?.id)?.id ??
      allLessons[0]?.id ??
      '',
  );
  const [tab, setTab] = useState('content');

  // 適用済みの「外からの選択」を id:seq で覚えておく。 これによりサイドバー操作は
  // 上書きせず、 同じレッスンを選び直した場合 (seq が変わる) には再適用できる。
  //
  // 初期値は null。 マウント時点の選択を「適用済み」にすると、 コース取得が終わる前に
  // マウントしたとき (リロード復帰) に上の useState が対象を見つけられず、 その後
  // コースが届いても再適用されずコース先頭に落ちてしまう。
  const selectionKey = initialLesson
    ? `${initialLesson.id}:${initialLesson.seq}`
    : null;
  const appliedSelectionRef = useRef<string | null>(null);

  const progressMap = useLessonProgressMap();

  const completedLessonCount = useMemo(
    () =>
      allLessons.filter((l) => resolveLessonStatus(l, progressMap) === 'done')
        .length,
    [allLessons, progressMap],
  );
  const progressPercent = allLessons.length
    ? Math.round((completedLessonCount / allLessons.length) * 100)
    : 0;

  const lessonObj: Lesson | undefined = useMemo(
    () => allLessons.find((l) => l.id === activeLesson) ?? allLessons[0],
    [allLessons, activeLesson],
  );

  // Q&A はレッスンが CMS の実体 (uuid) かつ バックエンド設定済みのときのみ永続化する。
  // fixtures のレッスン (id='l10' 等) では空状態を表示し、 モックには戻さない。
  const qaEnabled =
    isBackendConfigured() && UUID_RE.test(lessonObj?.id ?? '');
  const {
    threads: qaThreads,
    loading: qaLoading,
    refetch: qaRefetch,
  } = useLessonQuestions(lessonObj?.id ?? null, qaEnabled);

  // 配布資料も CMS の実体レッスン (uuid) のみ取得する (fixtures は空状態のまま)。
  const {
    materials,
    loading: materialsLoading,
    error: materialsError,
  } = useLessonMaterials(lessonObj?.id ?? null, qaEnabled);

  // 表示レッスンの解決。 「検索での選択の適用」と「コース切替時の先頭寄せ」を
  // 1 つの効果にまとめている。 別々の効果にすると、 別コースのレッスンを検索から
  // 選んだとき (course と initialLesson が同時に変わる) に同一コミット内で
  // 後者が古い activeLesson を見て先頭レッスンに上書きしてしまうため。
  useEffect(() => {
    if (allLessons.length === 0) {
      if (activeLesson !== '') setActiveLesson('');
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
      setActiveLesson(allLessons[0]!.id);
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
    activeSection && lessonObj
      ? activeSection.lessons.findIndex((l) => l.id === lessonObj.id)
      : 0;

  // lessonObj が無いコースでも hook 順序を保つため空文字を渡す (内部で no-op)
  const { markComplete } = useLessonProgress(lessonObj?.id ?? '');
  const handleMarkComplete = () => {
    if (lessonObj) markComplete();
  };

  // 滞在時間を学習時間として積む。 動画は VideoViewer が実再生秒数を記録するので除外
  // (両方が同じ watched_sec を書くと二重計上になる)。
  useStudyTime(lessonObj?.id ?? '', Boolean(lessonObj) && lessonObj?.type !== 'video');

  // 前のレッスンへ遷移 (Issue #77)。 locked はスキップして手前の解禁レッスンを探す。
  // 手前に解禁レッスンが無ければ null を返し、 呼び出し側でボタンを無効化する。
  const prevLessonId = useMemo(() => {
    const idx = allLessons.findIndex((l) => l.id === activeLesson);
    if (idx <= 0) return null;
    for (let i = idx - 1; i >= 0; i--) {
      const candidate = allLessons[i];
      if (candidate && resolveLessonStatus(candidate, progressMap) !== 'locked') {
        return candidate.id;
      }
    }
    return null;
  }, [allLessons, activeLesson, progressMap]);

  // 次のレッスンへ遷移。 locked はスキップして次の解禁レッスンを探す。 末尾なら CourseDetail に戻る。
  const goToNextLesson = useCallback(
    (currentId: string) => {
      const idx = allLessons.findIndex((l) => l.id === currentId);
      if (idx === -1) return;
      for (let i = idx + 1; i < allLessons.length; i++) {
        if (resolveLessonStatus(allLessons[i], progressMap) !== 'locked') {
          setActiveLesson(allLessons[i].id);
          return;
        }
      }
      setPage('course-detail');
    },
    [allLessons, progressMap, setPage],
  );

  // コード演習レッスン時にサイドバーを折りたたむ。 レッスン切替で同期。
  const isCodeLesson = lessonObj?.type === 'code' && Boolean(lessonObj?.assignmentId);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    setSidebarCollapsed(Boolean(isCodeLesson));
  }, [isCodeLesson, lessonObj?.id]);

  // レッスン切替で AI コンテキストを更新する (general/lesson/practice の遷移)。
  // - code レッスン: 'lesson' を流す (採点失敗の practice context は PracticeWorkspace 経由で上書き)
  // - その他: 'lesson'
  useEffect(() => {
    if (!setAIContext || !lessonObj) return;
    setAIContext({
      kind: 'lesson',
      lessonTitle: lessonObj.title,
      courseTitle: course.title,
    });
  }, [lessonObj?.id, lessonObj?.title, course.title, setAIContext]);

  const handlePracticeAskAi = useCallback(
    (ctx: { assignment: Assignment; userCode: string; summary: GradingSummary }) => {
      setAIContext?.({
        kind: 'practice',
        assignmentId: ctx.assignment.id,
        userCode: ctx.userCode,
        summary: ctx.summary,
      });
      onOpenAIBot?.();
    },
    [setAIContext, onOpenAIBot],
  );

  const handlePracticeCleared = useCallback(() => {
    markComplete();
    toast.success('課題クリア! 次のレッスンへ進めます');
  }, [markComplete]);

  if (!lessonObj) {
    return (
      <div className="p-10 text-sm text-ink-3">
        このコースにはレッスンがありません。
      </div>
    );
  }

  const isQuiz = lessonObj.type === 'quiz';
  const isCode = lessonObj.type === 'code';
  const isAssignment = lessonObj.type === 'assignment';
  const isText = lessonObj.type === 'text';
  const isVideo = lessonObj.type === 'video';
  const isSlides = lessonObj.type === 'slides';

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: sidebarCollapsed ? '40px 1fr' : '280px 1fr',
        minHeight: 'calc(100vh - 57px)',
      }}
    >
      {sidebarCollapsed ? (
        <aside className="border-r border-border bg-card py-3 sticky top-[57px] max-h-[calc(100vh-57px)] flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setPage('course-detail')}
            className="w-7 h-7 grid place-items-center text-ink-3 hover:bg-sunken rounded"
            title={course.title}
            aria-label={`コース詳細に戻る: ${course.title}`}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            className="w-7 h-7 grid place-items-center text-ink-3 hover:bg-sunken rounded"
            title="サイドバーを開く"
            aria-label="サイドバーを開く"
          >
            <ChevronRight size={14} />
          </button>
        </aside>
      ) : (
      <aside className="border-r border-border bg-card py-4 overflow-y-auto sticky top-[57px] max-h-[calc(100vh-57px)]">
        <div className="px-[18px] pb-3.5 border-b border-border mb-2">
          <div className="flex items-start gap-1">
            <button
              type="button"
              onClick={() => setPage('course-detail')}
              className="flex items-center gap-1 text-[11.5px] text-ink-3 mb-2 hover:text-foreground flex-1 min-w-0"
            >
              <ChevronLeft size={12} />
              <span className="truncate">{course.title}</span>
            </button>
            {isCodeLesson ? (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="text-ink-3 hover:text-foreground"
                title="サイドバーをたたむ"
                aria-label="サイドバーをたたむ"
              >
                <ChevronLeft size={14} />
              </button>
            ) : null}
          </div>
          <div className="text-sm font-semibold leading-snug">進捗</div>
          <div className="text-[11.5px] text-ink-3 mt-1.5">
            <strong>{progressPercent}%</strong> · セクション {sections.length}
          </div>
          <Progress value={progressPercent} tone="brand" className="mt-2" />
        </div>

        {sections.map((s) => {
          const doneCount = s.lessons.filter(
            (l) => resolveLessonStatus(l, progressMap) === 'done',
          ).length;
          return (
            <div key={s.id} className="py-2.5">
              <div className="px-[18px] py-2 text-[11px] font-semibold text-ink-3 uppercase tracking-wider flex items-center gap-1.5">
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
                    onClick={() => status !== 'locked' && setActiveLesson(l.id)}
                    disabled={status === 'locked'}
                    className={cn(
                      'w-full flex items-start gap-2.5 px-[18px] py-2 text-[12.5px] border-l-2 text-left',
                      'transition-colors',
                      isActive
                        ? 'bg-sunken text-foreground font-medium border-brand'
                        : status === 'locked'
                          ? 'text-ink-4 cursor-not-allowed border-transparent'
                          : 'text-ink-2 hover:bg-sunken hover:text-foreground border-transparent',
                    )}
                  >
                    <span className="shrink-0 mt-0.5 text-ink-3">
                      <LessonStatusIcon status={status} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{l.title}</div>
                      <div className="text-ink-3 text-[11px] mt-0.5 flex items-center gap-1">
                        <LessonTypeIcon type={l.type} size={10} />
                        <span>{l.duration}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </aside>
      )}

      <main className="min-w-0 flex flex-col">
        {isCode && lessonObj.assignmentId ? (
          // PracticeWorkspace 側で shared / CMS DB の双方を解決するため、
          // ここで findAssignment による事前フィルタは行わない (#10 — CMS で作られた課題対応)。
          <Suspense fallback={<ViewerLoading />}>
            <PracticeWorkspace
              key={lessonObj.id}
              assignmentId={lessonObj.assignmentId}
              embedded
              onCleared={handlePracticeCleared}
              onAskAi={handlePracticeAskAi}
              onGoToNextLesson={() => goToNextLesson(lessonObj.id)}
            />
          </Suspense>
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

        <div className="px-10 py-6 pb-12 max-w-[880px] mx-auto w-full">
          <div className="flex items-start gap-3 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-2">
                <Badge variant="accent">
                  <LessonTypeIcon type={lessonObj.type} size={10} />
                  {lessonTypeLabel[lessonObj.type]}
                </Badge>
                <span className="text-[11.5px] text-ink-3">
                  {activeSection ? activeSection.title : ''} ·{' '}
                  {lessonIndexInSection + 1} /{' '}
                  {activeSection ? activeSection.lessons.length : 0}
                </span>
              </div>
              <h1 className="text-[22px] tracking-tight font-semibold">{lessonObj.title}</h1>
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
              <TabsTrigger value="content">
                <FileText size={13} />
                教材
              </TabsTrigger>
              <TabsTrigger value="resources">
                <Folder size={13} />
                資料
                {/* ロード中は 0 と誤解されないよう件数バッジを出さない */}
                {materialsLoading ? null : (
                  <span className="text-[11px] bg-muted px-1.5 rounded-full ml-1">
                    {materials.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="qa">
                <MessageCircle size={13} />
                Q&A
                <span className="text-[11px] bg-muted px-1.5 rounded-full ml-1">
                  {qaThreads.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="notes">
                <Edit size={13} />
                ノート
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content">
              {isQuiz ? (
                <QuizPlayer
                  lessonId={lessonObj.id}
                  onComplete={handleMarkComplete}
                />
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
                <LessonOverview
                  lesson={lessonObj}
                  onComplete={handleMarkComplete}
                  onPrevLesson={
                    prevLessonId ? () => setActiveLesson(prevLessonId) : null
                  }
                  onOpenNotes={() => setTab('notes')}
                />
              ) : (
                <LessonReadable lesson={lessonObj} onComplete={handleMarkComplete} />
              )}
            </TabsContent>
            <TabsContent value="qa">
              <QAView
                threads={qaThreads}
                loading={qaLoading}
                enabled={qaEnabled}
                tenantId={tenantId}
                courseId={course.id}
                lessonId={lessonObj.id}
                currentUserId={currentUserId}
                onRefetch={qaRefetch}
              />
            </TabsContent>
            <TabsContent value="resources">
              <ResourcesList
                materials={materials}
                loading={materialsLoading}
                error={materialsError}
              />
            </TabsContent>
            <TabsContent value="notes">
              <NotesView lessonId={lessonObj.id} userId={currentUserId} />
            </TabsContent>
          </Tabs>
        </div>
          </>
        )}
      </main>
    </div>
  );
};

const ViewerLoading = () => (
  <div
    role="status"
    aria-label="ビューアを読み込み中"
    className="aspect-[16/9] max-h-[62vh] grid place-items-center bg-sunken text-ink-3 text-[12.5px]"
  >
    <div className="inline-flex items-center gap-2">
      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      ビューアを読み込み中…
    </div>
  </div>
);

const MissingMaterialFallback = ({ type }: { type: 'video' | 'slides' }) => (
  <div className="aspect-[16/9] max-h-[62vh] grid place-items-center bg-sunken border-b border-border px-6 text-center">
    <div className="max-w-md">
      <div className="text-[13.5px] font-semibold text-ink-1">教材を準備中です</div>
      <div className="text-[12px] text-ink-3 mt-1.5">
        {type === 'video' ? '動画' : 'スライド'}
        の素材がまだアップロードされていません。 講師がアップロード次第、 ここに表示されます。
      </div>
    </div>
  </div>
);

const LessonOverview = ({
  lesson,
  onComplete,
  onPrevLesson,
  onOpenNotes,
}: {
  lesson: Lesson;
  onComplete: () => void;
  /** 手前に解禁済みレッスンが無いときは null (ボタンを無効化する)。 */
  onPrevLesson: (() => void) | null;
  onOpenNotes: () => void;
}) => {
  const hasMaterial =
    (lesson.type === 'video' && Boolean(lesson.videoPath)) ||
    (lesson.type === 'slides' && Boolean(lesson.pdfPath));
  const materialLabel = lesson.type === 'video' ? '動画' : 'スライド';
  return (
    <div className="prose-lms">
      <h2>このレッスンについて</h2>
      {hasMaterial ? (
        <p>
          上の{materialLabel}で学習を進めてください。
          {lesson.type === 'video'
            ? ' 視聴秒数の90%に到達すると自動的に完了マークが付きます。'
            : ' ページ全体の90%を閲覧すると自動的に完了マークが付きます。'}
        </p>
      ) : (
        <p>
          {materialLabel}
          素材はまだ準備中です。 アップロードされ次第、 ここから視聴できるようになります。
        </p>
      )}
      <div className="flex gap-2.5 items-center pt-6 border-t border-border mt-8">
        <Button
          onClick={() => onPrevLesson?.()}
          disabled={!onPrevLesson}
          title={onPrevLesson ? undefined : '最初のレッスンです'}
        >
          <ChevronLeft size={13} />
          前のレッスン
        </Button>
        <div className="flex-1" />
        <Button onClick={onOpenNotes}>
          <Edit size={13} />
          ノートに追加
        </Button>
        {hasMaterial ? (
          <Button variant="accent" onClick={onComplete}>
            完了にする
            <ChevronRight size={13} />
          </Button>
        ) : null}
      </div>
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
const LessonReadable = ({
  lesson,
  onComplete,
}: {
  lesson: Lesson;
  onComplete: () => void;
}) => {
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
          <div className="text-[13.5px] font-semibold text-ink-1 mb-1.5">
            本文を準備中です
          </div>
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
            完了にする
            <ChevronRight size={13} />
          </Button>
        )}
      </div>
    </div>
  );
};

interface QAViewProps {
  threads: QuestionWithReplies[];
  loading: boolean;
  enabled: boolean;
  tenantId: string;
  courseId: string;
  lessonId: string;
  currentUserId: string | null;
  onRefetch: () => Promise<void>;
}

const QAView = ({
  threads,
  loading,
  enabled,
  tenantId,
  courseId,
  lessonId,
  currentUserId,
  onRefetch,
}: QAViewProps) => {
  if (!enabled) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-ink-3">
        <HelpCircle size={28} className="text-ink-4" />
        <div className="font-medium text-ink-2">Q&amp;A はまだ利用できません</div>
        <div className="text-[12.5px]">
          このレッスンが公開・保存されると、 ここで質問を投稿できるようになります。
        </div>
      </div>
    );
  }

  const handleCreate = async ({
    title,
    body,
  }: {
    title: string;
    body: string;
  }) => {
    try {
      await createQuestion({ tenantId, courseId, lessonId, title, body });
      await onRefetch();
      toast.success('質問を投稿しました');
    } catch (err) {
      console.error('[QAView] createQuestion failed', err);
      toast.error(err instanceof Error ? err.message : '質問の投稿に失敗しました');
      // 失敗を QuestionComposer へ伝播し、 入力フォームのクリアを防ぐ。
      throw err;
    }
  };

  const handleReply = async (questionId: string, body: string) => {
    try {
      await createReply(questionId, body);
      await onRefetch();
    } catch (err) {
      console.error('[QAView] createReply failed', err);
      toast.error(err instanceof Error ? err.message : '返信の送信に失敗しました');
      throw err;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <QuestionComposer
        onSubmit={handleCreate}
        bodyPlaceholder="このレッスンについて質問する…"
      />
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-3">
          <Loader2 size={16} className="animate-spin" /> 読み込み中…
        </div>
      ) : threads.length === 0 ? (
        <div className="py-10 text-center text-[12.5px] text-ink-3">
          まだ質問はありません。 最初の質問を投稿してみましょう。
        </div>
      ) : (
        threads.map((t) => (
          <QAThread
            key={t.id}
            thread={t}
            currentUserId={currentUserId}
            canReply
            onReply={(body) => handleReply(t.id, body)}
          />
        ))
      )}
    </div>
  );
};

/** ファイルサイズ表記 (1024 基数)。 */
const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
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
      console.error('[ResourcesList] download failed', err);
      toast.error(
        err instanceof Error ? err.message : 'ダウンロードに失敗しました',
      );
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-3">
        <Loader2 size={16} className="animate-spin" /> 読み込み中…
      </div>
    );
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

/**
 * レッスンごとの個人メモ (Issue #78)。
 *
 * バックエンド設定時はサーバ (`/api/lesson-notes`) に保存し、 端末をまたいで同じノートを
 * 参照・編集できる。 未設定時は従来どおり localStorage のみ (`useLessonNote` が吸収)。
 */
const NotesView = ({
  lessonId,
  userId,
}: {
  lessonId: string;
  /** ログイン中ユーザの ID。 切り替わったら前ユーザーのノートを持ち越さない。 */
  userId: string | null;
}) => {
  const {
    body,
    setBody,
    save,
    loading,
    saving,
    error,
    localError,
    remote,
    conflict,
    overLimit,
  } = useLessonNote(lessonId, userId);

  const handleSave = async () => {
    const result = await save();
    if (!result.ok) {
      toast.error('ノートの保存に失敗しました');
      return;
    }
    if (result.conflict) {
      toast.warning(
        '他の端末で更新されたノートがあるため保存されませんでした。 再読み込みしてください',
      );
      return;
    }
    toast.success('ノートを保存しました');
  };

  return (
    <Card>
      <CardContent>
        <Textarea
          className="min-h-[260px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX_NOTE_LENGTH}
          placeholder="このレッスンのメモを書き残せます…"
        />
        {overLimit ? (
          <p className="text-[11.5px] text-warning mt-2">
            ノートが {MAX_NOTE_LENGTH.toLocaleString()} 文字を超えています。
            超過分はこの端末にのみ残り、 他の端末には同期されません
          </p>
        ) : null}
        {conflict ? (
          <p className="text-[11.5px] text-warning mt-2">
            他の端末で更新されたノートがあります。 再読み込みすると最新の内容を取り込めます
          </p>
        ) : null}
        {error ? (
          <p className="text-[11.5px] text-destructive mt-2">
            サーバとの同期に失敗しました ({error})
            {localError ? null : '。 この端末には保存されています'}
          </p>
        ) : null}
        {localError ? (
          <p className="text-[11.5px] text-destructive mt-2">{localError}</p>
        ) : null}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11.5px] text-ink-3">
            {remote
              ? 'このノートはあなただけに見えます (端末をまたいで同期されます)'
              : 'このノートはあなただけに見えます (この端末のみ)'}
          </span>
          {loading || saving ? (
            <Loader2 size={12} className="animate-spin text-ink-3" />
          ) : null}
          <div className="flex-1" />
          <Button size="sm" onClick={handleSave} disabled={saving}>
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
