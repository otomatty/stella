import { lazy, Suspense, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
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
  Cpu,
  Upload,
  Send,
  HelpCircle,
  CheckCircle,
  Terminal,
  Loader2,
} from '@/lib/icons';
import type { Course, Section, Lesson, LessonType } from '@/data/types';
import { SES_COURSES, QA_THREAD } from '@/data/fixtures';
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

const SlidesViewer = lazy(() =>
  import('./SlidesViewer').then((m) => ({ default: m.SlidesViewer })),
);

interface LessonPlayerProps {
  course: Course;
  setPage: (page: string) => void;
}

const lessonTypeLabel: Record<LessonType, string> = {
  video: '動画',
  slides: 'スライド',
  text: 'テキスト',
  quiz: '小テスト',
  assignment: '課題',
  code: 'コーディング課題',
};

export const LessonPlayer = ({ course, setPage }: LessonPlayerProps) => {
  const sections: Section[] = course.sections ?? SES_COURSES[0].sections ?? [];
  const [activeLesson, setActiveLesson] = useState('l10');
  const [tab, setTab] = useState('content');

  const progressMap = useLessonProgressMap();

  const lessonObj: Lesson = useMemo(() => {
    const all = sections.flatMap((s) => s.lessons);
    return all.find((l) => l.id === activeLesson) ?? all[0];
  }, [sections, activeLesson]);

  const activeSectionIndex = useMemo(() => {
    const idx = sections.findIndex((s) => s.lessons.some((l) => l.id === lessonObj.id));
    return idx >= 0 ? idx : 0;
  }, [sections, lessonObj]);

  const activeSection = sections[activeSectionIndex] ?? sections[0];
  const lessonIndexInSection = activeSection
    ? activeSection.lessons.findIndex((l) => l.id === lessonObj.id)
    : 0;

  const { markComplete } = useLessonProgress(lessonObj.id);
  const handleMarkComplete = () => markComplete();

  const isQuiz = lessonObj.type === 'quiz';
  const isCode = lessonObj.type === 'code';
  const isText = lessonObj.type === 'text';
  const isVideo = lessonObj.type === 'video';
  const isSlides = lessonObj.type === 'slides';

  return (
    <div className="grid" style={{ gridTemplateColumns: '280px 1fr', minHeight: 'calc(100vh - 57px)' }}>
      <aside className="border-r border-border bg-card py-4 overflow-y-auto sticky top-[57px] max-h-[calc(100vh-57px)]">
        <div className="px-[18px] pb-3.5 border-b border-border mb-2">
          <button
            type="button"
            onClick={() => setPage('course-detail')}
            className="flex items-center gap-1 text-[11.5px] text-ink-3 mb-2 hover:text-foreground"
          >
            <ChevronLeft size={12} />
            {course.title}
          </button>
          <div className="text-sm font-semibold leading-snug">進捗</div>
          <div className="text-[11.5px] text-ink-3 mt-1.5">
            <strong>{course.progress}%</strong> · セクション {sections.length}
          </div>
          <Progress value={course.progress} tone="brand" className="mt-2" />
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

      <main className="min-w-0 flex flex-col">
        {isVideo && lessonObj.videoPath ? (
          <VideoViewer
            key={lessonObj.id}
            lessonId={lessonObj.id}
            videoPath={lessonObj.videoPath}
            totalSec={lessonObj.totalSec}
            onComplete={handleMarkComplete}
          />
        ) : null}

        {isSlides && lessonObj.pdfPath ? (
          <Suspense fallback={<ViewerLoading />}>
            <SlidesViewer
              key={lessonObj.id}
              lessonId={lessonObj.id}
              pdfPath={lessonObj.pdfPath}
              totalPages={lessonObj.totalPages}
              onComplete={handleMarkComplete}
            />
          </Suspense>
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
              ) : isCode ? (
                <WebIDE />
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

const LessonOverview = ({
  lesson,
  onComplete,
}: {
  lesson: Lesson;
  onComplete: () => void;
}) => (
  <div className="prose-lms">
    <h2>このレッスンについて</h2>
    <p>
      上の{lesson.type === 'video' ? '動画' : 'スライド'}
      で学習を進めてください。
      {lesson.type === 'video'
        ? ' 視聴秒数の90%に到達すると自動的に完了マークが付きます。'
        : ' ページ全体の90%を閲覧すると自動的に完了マークが付きます。'}
    </p>
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

const WebIDE = () => {
  const [file, setFile] = useState('script.js');
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<'ok' | null>(null);

  const run = () => {
    setRunning(true);
    setOutput(null);
    setTimeout(() => {
      setRunning(false);
      setOutput('ok');
    }, 1200);
  };

  return (
    <div>
      <div className="prose-lms mb-4">
        <h2>課題: シンプルな ToDo アプリ</h2>
        <p>
          HTML / CSS / JavaScript を使って、以下の要件を満たす ToDo アプリを実装してください。
          テストケースが全て通るとパス判定になります。
        </p>
        <ul>
          <li>入力欄から ToDo を追加できる</li>
          <li>完了フラグを切り替えられる</li>
          <li>削除できる</li>
          <li>XSS を起こさない（textContent を使う）</li>
        </ul>
      </div>

      <div className="grid grid-rows-[auto_1fr_auto] min-h-[520px] border border-border rounded-lg overflow-hidden ide-bg">
        <div className="flex px-2.5 ide-tabs-bg border-b ide-sep">
          {['index.html', 'style.css', 'script.js'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFile(f)}
              className={cn(
                'px-3.5 py-2.5 font-mono text-xs border-b-2 -mb-px',
                file === f
                  ? 'ide-tab-active border-brand ide-bg'
                  : 'ide-tab-inactive border-transparent',
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 min-h-0">
          <pre className="ide-bg py-3 px-0 text-[12.5px] leading-[1.65] font-mono overflow-auto whitespace-pre border-r ide-sep">
            {`  1 │ `}<span className="tok-kw">const</span>{` `}<span className="tok-fn">todos</span>{` = [];

  3 │ `}<span className="tok-kw">function</span>{` `}<span className="tok-fn">addTodo</span>{`(text) {
  4 │   `}<span className="tok-kw">if</span>{` (text.trim() === `}<span className="tok-str">""</span>{`) `}<span className="tok-kw">return</span>{`;
  5 │   todos.push({ text, done: `}<span className="tok-kw">false</span>{` });
  6 │   render();
  7 │ }

  9 │ `}<span className="tok-kw">function</span>{` `}<span className="tok-fn">render</span>{`() {
 10 │   `}<span className="tok-kw">const</span>{` list = document.getElementById(`}<span className="tok-str">"list"</span>{`);
 11 │   list.innerHTML = `}<span className="tok-str">""</span>{`;
 12 │   `}<span className="tok-kw">for</span>{` (`}<span className="tok-kw">const</span>{` [i, t] `}<span className="tok-kw">of</span>{` todos.entries()) {
 13 │     `}<span className="tok-kw">const</span>{` li = document.createElement(`}<span className="tok-str">"li"</span>{`);
 14 │     li.textContent = t.text;  `}<span className="tok-com">// XSS対策</span>{`
 15 │     list.appendChild(li);
 16 │   }
 17 │ }`}
          </pre>
          <div className="ide-output-bg font-mono text-xs leading-relaxed p-3.5 overflow-auto">
            <div className="mb-2.5 text-[oklch(80%_0.005_85)] font-medium">▾ 実行結果 / テスト</div>
            {!output && !running && (
              <div className="ide-muted">実行ボタンを押してテストを走らせてください</div>
            )}
            {running ? (
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[oklch(30%_0.01_260)] border-t-brand animate-spin-slow" />
                テスト実行中…
              </div>
            ) : null}
            {output === 'ok' ? (
              <>
                <div className="ide-ok">✓ ToDo を追加できる ... pass (12ms)</div>
                <div className="ide-ok">✓ 完了を切り替えられる ... pass (8ms)</div>
                <div className="ide-ok">✓ 削除できる ... pass (10ms)</div>
                <div className="ide-ok">✓ XSSを起こさない ... pass (15ms)</div>
                <div className="mt-2.5 border-t ide-sep pt-2">
                  <span className="ide-ok">4 passed</span>, 0 failed ・ 全テスト合格
                </div>
              </>
            ) : null}
          </div>
        </div>
        <div className="ide-tabs-bg px-3.5 py-2 flex items-center gap-2.5 text-[oklch(70%_0.01_260)] text-[11.5px] border-t ide-sep">
          <Cpu size={12} />
          sandbox: firecracker / 1core · 512MB · 30s
          <span className="flex-1" />
          <span>Node 20 · JavaScript</span>
          <Button size="sm" variant="primary" onClick={run}>
            {running ? '実行中…' : (
              <>
                <Play size={11} />
                実行
              </>
            )}
          </Button>
          <Button size="sm" variant="accent">
            <Upload size={11} />
            提出
          </Button>
        </div>
      </div>
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
export const __lesson_used = { Terminal, HelpCircle };
