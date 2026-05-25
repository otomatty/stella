import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Star,
  MessageCircle,
  Check,
  X,
  Edit,
  Info,
  Loader2,
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import type {
  ReviewSuggestion,
  RubricCriterion,
  ReviewVerdict,
} from '@falcon/shared/review/types';
import { useSubmission, useSubmissions } from '@/hooks/useSubmissions';
import { fetchReviewDraft } from '@/lib/review-draft-api';
import { formatSubmittedAt } from '@/lib/submissions-store';
import type { Tenant } from '@/data/types';
import { cn } from '@/lib/utils';

const severityDot: Record<ReviewSuggestion['severity'], string> = {
  high: 'bg-danger',
  med: 'bg-warning',
  low: 'bg-info',
};

interface ReviewEditorProps {
  tenantId: Tenant['id'];
  submissionId: string | null;
  setPage: (page: string) => void;
}

export const ReviewEditor = ({
  tenantId,
  submissionId,
  setPage,
}: ReviewEditorProps) => {
  const submission = useSubmission(tenantId, submissionId);
  const { update, finalize } = useSubmissions(tenantId);

  const [tab, setTab] = useState('ai');
  const [suggestions, setSuggestions] = useState<ReviewSuggestion[]>([]);
  const [rubric, setRubric] = useState<RubricCriterion[]>([]);
  const [verdict, setVerdict] = useState<ReviewVerdict | null>(null);
  const [notes, setNotes] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const draftRequestedRef = useRef<string | null>(null);
  const loadedSubmissionIdRef = useRef<string | null>(null);

  // 提出物の切替時のみローカル編集状態を初期化 (AI 下書き到着で上書きしない)
  useEffect(() => {
    if (!submission) {
      loadedSubmissionIdRef.current = null;
      setDraftLoading(false);
      return;
    }
    if (loadedSubmissionIdRef.current === submission.id) return;
    loadedSubmissionIdRef.current = submission.id;
    draftRequestedRef.current = null;
    setDraftLoading(false);
    setSuggestions(submission.aiSuggestions.map((s) => ({ ...s })));
    setRubric(submission.rubric.map((r) => ({ ...r })));
    setNotes(submission.reviewNotes);
    setVerdict(submission.verdict);
  }, [submission]);

  useEffect(() => {
    if (!submission || submission.aiReady) return;
    if (draftRequestedRef.current === submission.id) return;
    draftRequestedRef.current = submission.id;
    let cancelled = false;
    setDraftLoading(true);
    (async () => {
      try {
        const draft = await fetchReviewDraft({
          assignmentTitle: submission.assignmentTitle,
          courseTitle: submission.courseTitle,
          code: submission.codeLines.join('\n'),
          language: 'js',
        });
        if (cancelled) return;
        const saved = update(submission.id, {
          aiReady: true,
          aiSuggestions: draft.suggestions,
          rubric: draft.rubric,
          reviewNotes: draft.notes || submission.reviewNotes,
        });
        if (!saved) {
          toast.error('AI 下書きの保存に失敗しました');
          draftRequestedRef.current = null;
          return;
        }
        setSuggestions(draft.suggestions);
        setRubric(draft.rubric);
        if (draft.notes) {
          setNotes((prev) => (prev.trim() ? prev : draft.notes));
        }
      } catch (err) {
        console.error('[ReviewEditor] draft failed', err);
        toast.error('AI 下書きの生成に失敗しました');
        draftRequestedRef.current = null;
      } finally {
        if (!cancelled) setDraftLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [submission, update]);

  if (!submissionId || !submission) {
    return (
      <div className="p-7 text-center text-ink-3">
        <p className="mb-4">提出物が選択されていません。</p>
        <Button type="button" onClick={() => setPage('review-queue')}>
          キューに戻る
        </Button>
      </div>
    );
  }

  const adopt = (id: string) =>
    setSuggestions((s) => s.map((x) => (x.id === id ? { ...x, adopted: true } : x)));
  const reject = (id: string) =>
    setSuggestions((s) => s.map((x) => (x.id === id ? { ...x, adopted: false } : x)));
  const setRubricScore = (id: string, score: number) =>
    setRubric((r) => r.map((x) => (x.id === id ? { ...x, score } : x)));

  const totalScore = rubric.reduce((a, r) => a + r.score, 0);
  const maxScore = rubric.reduce((a, r) => a + r.max, 0);
  const pct = maxScore ? Math.round((totalScore / maxScore) * 100) : 0;

  const commentedLines = new Set(
    suggestions.filter((s) => s.adopted === true).map((s) => s.line),
  );

  const handleFinalize = (v: ReviewVerdict) => {
    const saved = finalize(submission.id, v, {
      reviewNotes: notes,
      aiSuggestions: suggestions,
      rubric,
    });
    if (!saved) {
      toast.error('採点の保存に失敗しました');
      return;
    }
    setVerdict(v);
    toast.success(
      v === 'pass'
        ? '合格として確定しました（デモ: 通知は未送信）'
        : v === 'resubmit'
          ? '再提出を依頼しました'
          : '不合格として確定しました',
    );
    setPage('review-queue');
  };

  const codeLines = submission.codeLines;

  return (
    <div className="flex flex-col min-h-[calc(100vh-57px)]">
      <div className="px-5 py-3.5 border-b border-border bg-card flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPage('review-queue')}
          className="flex items-center gap-2 cursor-pointer text-ink-3 hover:text-foreground"
        >
          <ChevronLeft size={14} />
          <span className="text-[11.5px]">キューに戻る</span>
        </button>
        <div className="w-px h-5 bg-border mx-1.5" />
        <div>
          <div className="text-sm font-semibold">
            {submission.assignmentTitle} · {submission.studentName}
          </div>
          <div className="text-[11.5px] text-ink-3">
            {submission.courseTitle}
            {submission.sectionTitle ? ` / ${submission.sectionTitle}` : ''} · 提出{' '}
            {formatSubmittedAt(submission.submittedAt)} · {submission.attempt}回目
          </div>
        </div>
        <div className="flex-1" />
        {draftLoading ? (
          <Badge variant="info">
            <Loader2 size={10} className="animate-spin" />
            AI生成中
          </Badge>
        ) : submission.aiReady ? (
          <Badge variant="accent">
            <Sparkles size={10} />
            AI下書き準備済
          </Badge>
        ) : null}
        <Button type="button" onClick={() => handleFinalize('resubmit')}>
          <ThumbsDown size={13} />
          再提出
        </Button>
        <Button type="button" variant="primary" onClick={() => handleFinalize('pass')}>
          <ThumbsUp size={13} />
          合格として確定
        </Button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 380px', minHeight: 0, flex: 1 }}>
        <div className="min-w-0 overflow-hidden flex flex-col">
          <div className="px-5 py-2.5 border-b border-border bg-card flex items-center gap-1.5">
            <Badge>提出コード</Badge>
            <div className="flex-1" />
            <span className="text-[11.5px] text-ink-3">{codeLines.length}行</span>
          </div>
          <div className="flex-1 overflow-auto font-mono text-[12.5px] leading-[1.6] py-3.5 code-viewer-bg">
            {codeLines.map((line, i) => {
              const lineNum = i + 1;
              const isCommented = commentedLines.has(lineNum);
              return (
                <div
                  key={i}
                  className={cn(
                    'flex gap-4 px-5 relative',
                    isCommented ? 'code-viewer-commented' : 'code-viewer-hover',
                  )}
                >
                  <div
                    className={cn(
                      'w-[30px] text-right shrink-0 select-none',
                      isCommented ? 'code-viewer-ln-commented' : 'code-viewer-ln',
                    )}
                  >
                    {lineNum}
                  </div>
                  <div className="flex-1 whitespace-pre">{syntax(line)}</div>
                  {isCommented ? (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 code-comment-indicator text-[10px] px-1.5 py-[1px] rounded-lg font-semibold">
                      レビュー
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="border-l border-border bg-card flex flex-col max-h-[calc(100vh-57px-64px)] overflow-hidden">
          <Tabs value={tab} onValueChange={setTab} className="flex flex-col min-h-0 flex-1">
            <TabsList className="border-b border-border flex px-0 gap-0 m-0">
              <TabTrigger value="ai">
                <Sparkles size={13} />
                AI 下書き
                <Count>{suggestions.length}</Count>
              </TabTrigger>
              <TabTrigger value="rubric">
                <Star size={13} />
                ルーブリック
              </TabTrigger>
              <TabTrigger value="comment">
                <MessageCircle size={13} />
                総評
              </TabTrigger>
            </TabsList>

            <TabsContent
              value="ai"
              className="mt-0 p-5 overflow-y-auto flex-1 data-[state=inactive]:hidden"
            >
              <div className="flex gap-2.5 items-start bg-gradient-to-br from-[oklch(97%_0.02_265)] to-[oklch(94%_0.04_265)] border border-[oklch(85%_0.06_265)] rounded-md px-3.5 py-3 mb-3.5 text-[12.5px] text-brand-ink">
                <Sparkles size={15} className="shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">AIは下書きです。</strong>
                  採用・却下・編集を行い、講師の判断で最終確定してください。完全自動化はしません。
                </div>
              </div>

              {draftLoading && suggestions.length === 0 ? (
                <div className="text-ink-3 text-[12.5px] flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  AI 下書きを生成しています…
                </div>
              ) : null}

              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    'border rounded-md p-3.5 mb-2.5 bg-card',
                    s.adopted === true && 'border-success bg-success-soft',
                    s.adopted === false && 'opacity-55',
                    s.adopted === null && 'border-border',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5 text-[11.5px] font-semibold uppercase tracking-wider">
                    <span
                      className={cn('w-2 h-2 rounded-full inline-block', severityDot[s.severity])}
                    />
                    <span>{s.category}</span>
                    <span className="font-mono bg-muted text-ink-2 px-1.5 py-px rounded-[3px] text-[11px] font-medium normal-case tracking-normal">
                      Line {s.line}
                    </span>
                    <div className="flex-1" />
                    {s.adopted === true ? <Badge variant="success">採用</Badge> : null}
                    {s.adopted === false ? <Badge>却下</Badge> : null}
                  </div>
                  <div className="text-[12.5px] leading-relaxed text-ink-2 mb-2">{s.body}</div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => adopt(s.id)}
                      disabled={s.adopted === true}
                    >
                      <Check size={11} />
                      採用
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => reject(s.id)}
                      disabled={s.adopted === false}
                    >
                      <X size={11} />
                      却下
                    </Button>
                    <Button size="sm" type="button" variant="ghost" disabled title="今後対応">
                      <Edit size={11} />
                      編集
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent
              value="rubric"
              className="mt-0 p-5 overflow-y-auto flex-1 data-[state=inactive]:hidden"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="text-xl font-semibold">
                  {totalScore}
                  <span className="text-xs text-ink-3">/{maxScore}</span>
                </div>
                <div className="flex-1" />
                <div className="text-xl font-semibold text-brand">{pct}%</div>
              </div>
              <Progress value={pct} tone="brand" className="mb-4" />

              {rubric.map((r) => (
                <div
                  key={r.id}
                  className="grid items-center gap-3 py-2.5 border-b border-border last:border-b-0"
                  style={{ gridTemplateColumns: '1fr auto' }}
                >
                  <div>
                    <div className="text-[13px] font-medium">{r.name}</div>
                    <div className="text-[11.5px] text-ink-3 mt-0.5">{r.desc}</div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: r.max }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRubricScore(r.id, n)}
                        className={cn(
                          'w-[26px] h-[26px] rounded-[4px] grid place-items-center text-[11px] font-semibold',
                          r.score === n
                            ? 'bg-brand text-white border border-brand'
                            : 'border border-border-2 text-ink-3 bg-card hover:border-brand hover:text-brand',
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent
              value="comment"
              className="mt-0 p-5 overflow-y-auto flex-1 data-[state=inactive]:hidden"
            >
              <Label>総評コメント（受講者に通知されます）</Label>
              <Textarea
                className="min-h-[160px] mb-3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <Label>判定</Label>
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant={verdict === 'pass' ? 'primary' : 'default'}
                  onClick={() => setVerdict('pass')}
                >
                  <Check size={13} />
                  合格
                </Button>
                <Button
                  type="button"
                  variant={verdict === 'resubmit' ? 'primary' : 'default'}
                  onClick={() => setVerdict('resubmit')}
                >
                  再提出
                </Button>
                <Button
                  type="button"
                  variant={verdict === 'fail' ? 'primary' : 'default'}
                  onClick={() => setVerdict('fail')}
                >
                  不合格
                </Button>
              </div>

              <Button
                type="button"
                variant="accent"
                className="w-full mb-3"
                onClick={() => verdict && handleFinalize(verdict)}
                disabled={!verdict}
              >
                採点を確定
              </Button>

              <div className="flex gap-2.5 items-start bg-brand-soft border border-brand/30 rounded-md px-3.5 py-3 text-[12.5px] text-brand-ink">
                <Info size={14} />
                <div>採点を確定すると受講者にメール + LMS通知が送信されます（デモでは未送信）。</div>
              </div>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
};

const TabTrigger = ({ value, children }: { value: string; children: ReactNode }) => (
  <TabsTrigger
    value={value}
    className={cn(
      'flex-1 justify-center px-3.5 py-2.5 text-xs font-medium',
      'data-[state=active]:border-brand',
    )}
  >
    {children}
  </TabsTrigger>
);

const Count = ({ children }: { children: ReactNode }) => (
  <span className="text-[11px] px-1.5 rounded-lg bg-muted text-ink-2 group-data-[state=active]:bg-brand-soft group-data-[state=active]:text-brand-ink">
    {children}
  </span>
);

function syntax(line: string): ReactNode {
  type Part = { t: string; cls: string | null };
  const patterns: Array<[RegExp, string]> = [
    [/\/\/[^\n]*/g, 'tok-com'],
    [/"[^"]*"/g, 'tok-str'],
    [/\b(const|let|var|function|if|else|for|return|new|class|this|of)\b/g, 'tok-kw'],
    [/\b(true|false|null|undefined)\b/g, 'tok-num'],
    [/\b\d+\b/g, 'tok-num'],
  ];
  let parts: Part[] = [{ t: line, cls: null }];
  for (const [re, cls] of patterns) {
    parts = parts.flatMap<Part>((p) => {
      if (p.cls) return [p];
      const out: Part[] = [];
      let last = 0;
      p.t.replace(re, (m, i: number) => {
        if (i > last) out.push({ t: p.t.slice(last, i), cls: null });
        out.push({ t: m, cls });
        last = i + m.length;
        return m;
      });
      if (last < p.t.length) out.push({ t: p.t.slice(last), cls: null });
      return out.length ? out : [p];
    });
  }
  return parts.map((p, i) =>
    p.cls ? (
      <span key={i} className={p.cls}>
        {p.t}
      </span>
    ) : (
      p.t
    ),
  );
}
