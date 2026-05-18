import { useState, type ReactNode } from 'react';
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
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  SUBMITTED_CODE,
  AI_SUGGESTIONS,
  RUBRIC,
} from '@/data/fixtures';
import type { AISuggestion, RubricCriterion } from '@/data/types';
import { cn } from '@/lib/utils';

const severityDot: Record<AISuggestion['severity'], string> = {
  high: 'bg-danger',
  med: 'bg-warning',
  low: 'bg-info',
};

interface ReviewEditorProps {
  setPage: (page: string) => void;
}

export const ReviewEditor = ({ setPage }: ReviewEditorProps) => {
  const [tab, setTab] = useState('ai');
  const [suggestions, setSuggestions] = useState<AISuggestion[]>(AI_SUGGESTIONS);
  const [rubric, setRubric] = useState<RubricCriterion[]>(RUBRIC);
  const [verdict, setVerdict] = useState<'pass' | 'resubmit' | 'fail' | null>(null);
  const [notes, setNotes] = useState(
    'コードは動作していますが、innerHTML による XSS リスクと等価演算子の使い方に改善の余地があります。ES2015 以降の記法に統一すると、今後の可読性も上がります。',
  );

  const adopt = (id: string) =>
    setSuggestions((s) => s.map((x) => (x.id === id ? { ...x, adopted: true } : x)));
  const reject = (id: string) =>
    setSuggestions((s) => s.map((x) => (x.id === id ? { ...x, adopted: false } : x)));
  const setRubricScore = (id: string, score: number) =>
    setRubric((r) => r.map((x) => (x.id === id ? { ...x, score } : x)));

  const totalScore = rubric.reduce((a, r) => a + r.score, 0);
  const maxScore = rubric.reduce((a, r) => a + r.max, 0);
  const pct = Math.round((totalScore / maxScore) * 100);

  const commentedLines = new Set(
    suggestions.filter((s) => s.adopted === true).map((s) => s.line),
  );

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
          <div className="text-sm font-semibold">ランディングページ模写 · 田中 翔太</div>
          <div className="text-[11.5px] text-ink-3">
            Web開発基礎 / セクション 02 · 提出 2時間前 · 1回目
          </div>
        </div>
        <div className="flex-1" />
        <Badge variant="accent">
          <Sparkles size={10} />
          AI下書き準備済
        </Badge>
        <Button>
          <ThumbsDown size={13} />
          再提出
        </Button>
        <Button variant="primary" onClick={() => setVerdict('pass')}>
          <ThumbsUp size={13} />
          合格として確定
        </Button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 380px', minHeight: 0, flex: 1 }}>
        <div className="min-w-0 overflow-hidden flex flex-col">
          <div className="px-5 py-2.5 border-b border-border bg-card flex items-center gap-1.5">
            <Badge>script.js</Badge>
            <Badge>index.html</Badge>
            <Badge>style.css</Badge>
            <div className="flex-1" />
            <span className="text-[11.5px] text-ink-3">4ファイル · 412行</span>
          </div>
          <div className="flex-1 overflow-auto font-mono text-[12.5px] leading-[1.6] py-3.5 code-viewer-bg">
            {SUBMITTED_CODE.map((line, i) => {
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
                      onClick={() => adopt(s.id)}
                      disabled={s.adopted === true}
                    >
                      <Check size={11} />
                      採用
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => reject(s.id)}
                      disabled={s.adopted === false}
                    >
                      <X size={11} />
                      却下
                    </Button>
                    <Button size="sm" variant="ghost">
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
                    {[1, 2, 3, 4].map((n) => (
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

              <div className="flex gap-2.5 items-start bg-gradient-to-br from-[oklch(97%_0.02_265)] to-[oklch(94%_0.04_265)] border border-[oklch(85%_0.06_265)] rounded-md px-3.5 py-3 mt-4 text-[12.5px] text-brand-ink">
                <Sparkles size={14} />
                <div>
                  <strong className="font-semibold">AIの採点下書き:</strong> 3 / 3 / 2 / 1 (計 9/16
                  · 56%)。セキュリティと設計の観点で減点。
                </div>
              </div>
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
                  variant={verdict === 'pass' ? 'primary' : 'default'}
                  onClick={() => setVerdict('pass')}
                >
                  <Check size={13} />
                  合格
                </Button>
                <Button
                  variant={verdict === 'resubmit' ? 'primary' : 'default'}
                  onClick={() => setVerdict('resubmit')}
                >
                  再提出
                </Button>
                <Button
                  variant={verdict === 'fail' ? 'primary' : 'default'}
                  onClick={() => setVerdict('fail')}
                >
                  不合格
                </Button>
              </div>

              <div className="flex gap-2.5 items-start bg-brand-soft border border-brand/30 rounded-md px-3.5 py-3 text-[12.5px] text-brand-ink">
                <Info size={14} />
                <div>採点を確定すると受講者にメール + LMS通知が送信されます。</div>
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

/* lightweight JS syntax highlighter — returns an array of React children */
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
