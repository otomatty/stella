import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  MessageCircle,
  Edit,
  Clock,
  Info,
  Check,
  X,
  Code,
  Download,
  Send,
  HelpCircle,
  CheckCircle,
  Loader2,
} from '@/lib/icons';
import type { Course, Section, Lesson, LessonType } from '@/data/types';
import { SES_COURSES, QA_THREAD } from '@/data/fixtures';
import type { ChatContext, GradingSummary } from '@falcon/shared/ai/types';
import type { Assignment } from '@falcon/shared/types';
import { findAssignment } from '@falcon/shared/assignments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { LessonTypeIcon, LessonStatusIcon } from './CourseDetail';
import { VideoViewer } from './VideoViewer';
import { resolveLessonStatus } from '@/lib/lesson-progress';
import { useLessonProgress, useLessonProgressMap } from '@/hooks/useLessonProgress';
import { cn } from '@/lib/utils';
import { PracticeWorkspace } from '@/practice/PracticeWorkspace';

const SlidesViewer = lazy(() =>
  import('./SlidesViewer').then((m) => ({ default: m.SlidesViewer })),
);

interface LessonPlayerProps {
  course: Course;
  setPage: (page: string) => void;
  /** AIChatBot を開くトリガ。 PracticeWorkspace の「AI に質問する」 から呼ぶ。 */
  onOpenAIBot?: () => void;
  /** レッスン (またはコード演習) の文脈を AIChatBot に伝えるための setter。 */
  setAIContext?: (ctx: ChatContext) => void;
}

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
  onOpenAIBot,
  setAIContext,
}: LessonPlayerProps) => {
  const sections: Section[] = course.sections ?? SES_COURSES[0].sections ?? [];
  const allLessons = useMemo(() => sections.flatMap((s) => s.lessons), [sections]);
  const [activeLesson, setActiveLesson] = useState<string>(
    () => allLessons.find((l) => l.id === 'l10')?.id ?? allLessons[0]?.id ?? '',
  );
  const [tab, setTab] = useState('content');

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

  // course 切り替え時に activeLesson が新コースに含まれていなければ先頭に揃える
  // (lessonObj 経由ではなく allLessons から直接 foundId を計算する)
  useEffect(() => {
    const foundId =
      allLessons.find((l) => l.id === activeLesson)?.id ??
      allLessons[0]?.id ??
      '';
    if (foundId !== activeLesson) {
      setActiveLesson(foundId);
    }
  }, [allLessons, activeLesson]);

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
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            className="w-7 h-7 grid place-items-center text-ink-3 hover:bg-sunken rounded"
            title="サイドバーを開く"
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
          findAssignment(lessonObj.assignmentId) ? (
            <PracticeWorkspace
              key={lessonObj.id}
              assignmentId={lessonObj.assignmentId}
              embedded
              onCleared={handlePracticeCleared}
              onAskAi={handlePracticeAskAi}
              onGoToNextLesson={() => goToNextLesson(lessonObj.id)}
            />
          ) : (
            <div className="p-10 text-sm text-ink-3">
              この演習レッスンに紐付く課題 (<code>{lessonObj.assignmentId}</code>) が
              <code>@falcon/shared</code> に見つかりません。 fixtures を確認してください。
            </div>
          )
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

        {isSlides ? (
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
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {lessonObj.duration}
                </span>
                <span className="text-ink-4">·</span>
                <span>講師: 堀江メンター</span>
                <span className="text-ink-4">·</span>
                <span>最終更新 4月14日</span>
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
                <span className="text-[11px] bg-muted px-1.5 rounded-full ml-1">3</span>
              </TabsTrigger>
              <TabsTrigger value="qa">
                <MessageCircle size={13} />
                Q&A
                <span className="text-[11px] bg-muted px-1.5 rounded-full ml-1">
                  {QA_THREAD.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="notes">
                <Edit size={13} />
                ノート
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content">
              {isQuiz ? (
                <QuizView />
              ) : isText ? (
                <LessonReadable onComplete={handleMarkComplete} />
              ) : isVideo || isSlides ? (
                <LessonOverview lesson={lessonObj} onComplete={handleMarkComplete} />
              ) : (
                <LessonReadable onComplete={handleMarkComplete} />
              )}
            </TabsContent>
            <TabsContent value="qa">
              <QAView />
            </TabsContent>
            <TabsContent value="resources">
              <ResourcesList />
            </TabsContent>
            <TabsContent value="notes">
              <NotesView />
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
}: {
  lesson: Lesson;
  onComplete: () => void;
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
        <Button>
          <ChevronLeft size={13} />
          前のレッスン
        </Button>
        <div className="flex-1" />
        <Button>
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

const LessonReadable = ({ onComplete }: { onComplete: () => void }) => (
  <div className="prose-lms">
    <h2>レッスンの目的</h2>
    <p>
      関数が呼び出された時に生成される「実行コンテキスト」と、そこに束縛される変数のスコープについて理解します。
      クロージャという仕組みが、関数外部から隠蔽された状態を保持するためにどう使われるかを、具体例を通して学びます。
    </p>

    <h2>サンプルコード</h2>
    <pre>
      <code>{`function makeCounter() {
  let count = 0;
  return function() {
    count += 1;
    return count;
  };
}

const counter = makeCounter();
counter(); // 1
counter(); // 2
counter(); // 3`}</code>
    </pre>

    <div className="border border-border border-l-[3px] border-l-brand bg-card rounded-sm px-4 py-3 my-4 flex gap-2.5 items-start text-[13.5px]">
      <Info size={15} className="text-brand shrink-0 mt-0.5" />
      <div>
        <strong>チェックポイント</strong> — <code>makeCounter</code> を2回呼ぶと、それぞれが独立した{' '}
        <code>count</code> を持ちます。 変数の共有ではなく「関数呼び出しごとに新しい環境」が作られる点がポイントです。
      </div>
    </div>

    <h2>理解度チェック</h2>
    <ul>
      <li>クロージャの主な用途3つを挙げられますか？</li>
      <li>
        <code>var</code> と <code>let</code> をループ内で使った時のスコープの違いは？
      </li>
      <li>IIFE（即時実行関数）はなぜ古くからクロージャと組み合わせて使われてきたのか？</li>
    </ul>

    <div className="flex gap-2.5 items-center pt-6 border-t border-border mt-8">
      <Button>
        <ChevronLeft size={13} />
        前のレッスン
      </Button>
      <div className="flex-1" />
      <Button>
        <Edit size={13} />
        ノートに追加
      </Button>
      <Button variant="accent" onClick={onComplete}>
        完了にする
        <ChevronRight size={13} />
      </Button>
    </div>
  </div>
);

interface QuizOption {
  id: number;
  text: string;
  correct?: boolean;
}

const QUIZ_OPTIONS: QuizOption[] = [
  { id: 0, text: '毎回同じ変数 count を参照しているから' },
  {
    id: 1,
    text: '関数呼び出しごとに新しいレキシカル環境が作られ、独立した束縛を持つから',
    correct: true,
  },
  { id: 2, text: 'JavaScriptエンジンが変数を複製して保持しているから' },
  { id: 3, text: 'グローバル変数として保存されているから' },
];

const QuizView = () => {
  const [selected, setSelected] = useState<number>(1);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 text-xs text-ink-3">
        <span>問題 3 / 10</span>
        <div className="flex-1 h-1 bg-muted rounded-sm overflow-hidden">
          <div className="h-full bg-brand" style={{ width: '30%' }} />
        </div>
        <span className="flex items-center gap-1">
          <Clock size={12} /> 残り 12:40
        </span>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-1.5 mb-2">
          <Badge variant="accent">単一選択</Badge>
          <span className="text-[11.5px] text-ink-3">配点 10点</span>
        </div>
        <div className="text-lg font-semibold tracking-tight leading-snug mb-1.5">
          makeCounter() を複数回呼び出した時、なぜそれぞれの counter が独立した値を持つのでしょうか？
        </div>
        <div className="text-xs text-ink-3 mb-4">最も適切な説明を1つ選んでください。</div>

        {QUIZ_OPTIONS.map((o) => {
          const isCorrect = submitted && o.correct;
          const isWrong = submitted && selected === o.id && !o.correct;
          const isSelected = selected === o.id;
          return (
            <button
              type="button"
              key={o.id}
              onClick={() => !submitted && setSelected(o.id)}
              className={cn(
                'w-full flex items-start gap-3 p-3.5 border rounded-md bg-card mb-2 transition-colors text-left',
                submitted ? 'cursor-default' : 'cursor-pointer hover:border-ink-3',
                isSelected && !submitted && 'border-brand bg-brand-soft',
                isCorrect && 'border-success bg-success-soft',
                isWrong && 'border-danger bg-danger-soft',
                !isSelected && !isCorrect && !isWrong && 'border-border-2',
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-[1.5px] grid place-items-center shrink-0 mt-0.5 text-[11px] font-semibold',
                  isSelected && !submitted && 'border-brand bg-brand text-white',
                  isCorrect && 'border-success bg-success text-white',
                  isWrong && 'border-danger bg-danger text-white',
                  !isSelected && !isCorrect && !isWrong && 'border-border-strong text-ink-3',
                )}
              >
                {submitted && o.correct ? (
                  <Check size={12} />
                ) : submitted && isSelected ? (
                  <X size={12} />
                ) : (
                  String.fromCharCode(65 + o.id)
                )}
              </div>
              <div className="flex-1 text-sm leading-relaxed">
                {o.text}
                {submitted && o.correct ? (
                  <div className="mt-2 text-xs text-ink-2 pt-2 border-t border-dashed border-border">
                    <strong>解説:</strong>{' '}
                    関数が呼び出されるたびに新しい実行コンテキストが生成され、その中の{' '}
                    <code>let count</code>{' '}
                    は毎回別々の束縛を持ちます。返された内側の関数はその束縛への参照（クロージャ）を保持するので、カウンターごとに独立した状態になります。
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}

        <div className="flex gap-2.5 mt-5 pt-4 border-t border-border">
          <Button>前の問題</Button>
          <div className="flex-1" />
          {!submitted ? (
            <Button variant="accent" onClick={() => setSubmitted(true)}>
              回答する
            </Button>
          ) : (
            <Button variant="accent">
              次の問題
              <ChevronRight size={13} />
            </Button>
          )}
        </div>
      </Card>

      {submitted ? (
        <Card className="mt-4 border-success bg-success-soft">
          <CardContent className="flex items-center gap-3">
            <CheckCircle size={20} className="text-success" />
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-success">正解です！</div>
              <div className="text-[11.5px] text-ink-3">現在の獲得点数: 27 / 30 (90%)</div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};


const QAView = () => {
  const [msgs, setMsgs] = useState(QA_THREAD);
  const [draft, setDraft] = useState('');

  const send = () => {
    if (!draft.trim()) return;
    setMsgs((m) => [
      ...m,
      {
        id: Date.now(),
        who: '田中 翔太',
        me: true,
        initials: 'TS',
        time: 'たった今',
        body: draft.trim(),
      },
    ]);
    setDraft('');
  };

  return (
    <Card className="h-[520px] flex flex-col overflow-hidden">
      <CardHeader>
        <CardTitle>レッスンQ&A</CardTitle>
        <Badge>スレッド 1 · メッセージ {msgs.length}</Badge>
      </CardHeader>
      <div className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-3.5">
        {msgs.map((m) => (
          <div
            key={m.id}
            className={cn('flex gap-2.5 max-w-[88%]', m.me && 'self-end flex-row-reverse')}
          >
            <Avatar size="sm">
              <AvatarFallback tone={m.c ?? 'c2'}>{m.initials}</AvatarFallback>
            </Avatar>
            <div>
              <div
                className={cn(
                  'rounded-xl px-3 py-2.5 text-[13px] leading-relaxed',
                  m.me ? 'bg-brand text-white' : 'bg-sunken text-foreground',
                )}
              >
                {m.body}
              </div>
              <div
                className={cn('text-[11px] text-ink-3 mt-1', m.me ? 'text-right' : '')}
              >
                {m.who} · {m.time}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-3.5 py-3 border-t border-border flex gap-2 items-end bg-card">
        <Textarea
          placeholder="メッセージを入力…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="min-h-[38px] max-h-[120px] text-[13px] py-2 px-2.5"
        />
        <Button variant="accent" size="icon" onClick={send}>
          <Send size={13} />
        </Button>
      </div>
    </Card>
  );
};

const RESOURCES: Array<{
  icon: typeof FileText;
  t: string;
  s: string;
}> = [
  { icon: FileText, t: '関数とスコープ — 補足スライド.pdf', s: '2.4 MB · PDF' },
  { icon: Code, t: 'クロージャのサンプルコード集.zip', s: '18 KB · ZIP' },
  { icon: FileText, t: '参考リンク集（外部リソース）', s: '4件のリンク' },
];

const ResourcesList = () => (
  <Card>
    {RESOURCES.map((r, i) => {
      const Icon = r.icon;
      return (
        <div
          key={i}
          className={cn(
            'flex items-center gap-3 px-4 py-3.5 cursor-pointer',
            i < RESOURCES.length - 1 ? 'border-b border-border' : '',
          )}
        >
          <div className="w-9 h-9 rounded-md bg-sunken grid place-items-center text-ink-2">
            <Icon size={16} />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-medium">{r.t}</div>
            <div className="text-[11.5px] text-ink-3 mt-0.5">{r.s}</div>
          </div>
          <Button size="sm">
            <Download size={12} />
            ダウンロード
          </Button>
        </div>
      );
    })}
  </Card>
);

const NotesView = () => (
  <Card>
    <CardContent>
      <Textarea
        className="min-h-[260px]"
        defaultValue={`# 関数とスコープ メモ

- クロージャ = 関数 + それが生成された環境
- makeCounter を呼ぶたびに新しい count が生まれる
- var → let で書き直すとループのスコープ問題が解消`}
      />
      <div className="flex items-center mt-2">
        <span className="text-[11.5px] text-ink-3">このノートはあなただけに見えます</span>
        <div className="flex-1" />
        <Button size="sm">保存</Button>
      </div>
    </CardContent>
  </Card>
);

// re-export noisy imports so TS doesn't whine about unused
export const __lesson_used = { HelpCircle };
