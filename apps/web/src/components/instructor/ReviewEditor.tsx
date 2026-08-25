import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { toast } from "sonner";
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
  AlertTriangle,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatGradingSummaryText } from "@falcon/shared/review/grading-summary";
import type {
  GradingSummary,
  ReviewSuggestion,
  RubricCriterion,
  ReviewVerdict,
} from "@falcon/shared/review/types";
import { useSubmission, useSubmissions } from "@/hooks/useSubmissions";
import { isBackendConfigured } from "@/lib/backend";
import { fetchReviewDraft } from "@/lib/review-draft-api";
import { SubmissionConflictError, formatSubmittedAt } from "@/lib/submissions-store";
import type { Tenant } from "@/data/types";
import { cn } from "@/lib/utils";

/**
 * 提出の「版」。 学習者が同じ提出を引き継ぎ直すと id は据え置きでコードが変わるため、
 * id だけでは古い状態を握り続けてしまう。 `submittedAt` は引き継ぎ直しでのみ動く。
 */
function submissionVersion(submission: { id: string; submittedAt: number }): string {
  return `${submission.id}:${submission.submittedAt}`;
}

const severityDot: Record<ReviewSuggestion["severity"], string> = {
  high: "bg-danger",
  med: "bg-warning",
  low: "bg-info",
};

interface ReviewEditorProps {
  tenantId: Tenant["id"];
  submissionId: string | null;
  setPage: (page: string) => void;
}

export const ReviewEditor = ({ tenantId, submissionId, setPage }: ReviewEditorProps) => {
  const submission = useSubmission(tenantId, submissionId);
  const { update, finalize } = useSubmissions(tenantId);

  const [tab, setTab] = useState("ai");
  const [suggestions, setSuggestions] = useState<ReviewSuggestion[]>([]);
  const [rubric, setRubric] = useState<RubricCriterion[]>([]);
  const [verdict, setVerdict] = useState<ReviewVerdict | null>(null);
  const [notes, setNotes] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const draftRequestedRef = useRef<string | null>(null);
  const loadedVersionRef = useRef<string | null>(null);

  // 提出物の切替時のみローカル編集状態を初期化 (AI 下書き到着で上書きしない)。
  //
  // id ではなく id + submittedAt で見る。 学習者が同じ提出を引き継ぎ直すと id は
  // そのままでコードだけ変わるので、 id で見ていると古い下書きを表示し続け、
  // 下書きの再生成も走らない。 `submittedAt` が動くのは引き継ぎ直しのときだけ
  // (講師側の PATCH は触らない) なので、 自分の楽観更新では初期化されない。
  useEffect(() => {
    if (!submission) {
      loadedVersionRef.current = null;
      setDraftLoading(false);
      return;
    }
    const version = submissionVersion(submission);
    if (loadedVersionRef.current === version) return;
    loadedVersionRef.current = version;
    draftRequestedRef.current = null;
    setDraftLoading(false);
    // 詰まって引き継がれた提出は、 まず「どこで落ちたか」から読ませる。
    setTab(submission.gradingSummary ? "grade" : "ai");
    setSuggestions(submission.aiSuggestions.map((s) => ({ ...s })));
    setRubric(submission.rubric.map((r) => ({ ...r })));
    setNotes(submission.reviewNotes);
    setVerdict(submission.verdict);
  }, [submission]);

  useEffect(() => {
    if (!submission || submission.aiReady) return;
    const version = submissionVersion(submission);
    if (draftRequestedRef.current === version) return;
    draftRequestedRef.current = version;
    const requestId = submission.id;
    setDraftLoading(true);
    (async () => {
      try {
        const summary = submission.gradingSummary;
        const draft = await fetchReviewDraft({
          assignmentTitle: submission.assignmentTitle,
          courseTitle: submission.courseTitle,
          code: submission.codeLines.join("\n"),
          language: summary?.language ?? "js",
          ...(summary ? { gradingSummary: formatGradingSummaryText(summary) } : {}),
        });
        // 楽観更新の emit で effect が再実行されても、保存と同一提出の UI 反映は続行する。
        const saved = await update(requestId, {
          aiReady: true,
          aiSuggestions: draft.suggestions,
          rubric: draft.rubric,
          reviewNotes: draft.notes || submission.reviewNotes,
        });
        if (!saved) {
          if (loadedVersionRef.current === version) {
            toast.error("AI 下書きの保存に失敗しました");
          }
          draftRequestedRef.current = null;
          return;
        }
        if (loadedVersionRef.current !== version) return;
        setSuggestions(draft.suggestions);
        setRubric(draft.rubric);
        if (draft.notes) {
          setNotes((prev) => (prev.trim() ? prev : draft.notes));
        }
      } catch (err) {
        // 学習者が引き継ぎ直した (409)。 エラーにはせず、 最新化された提出の
        // 新しい version でこの effect が再実行されるのに任せる。 ここで ref を
        // 空に戻すと、 最新化に失敗して version が変わらなかったときに同じ
        // リクエストを撃ち続けてしまう。
        if (err instanceof SubmissionConflictError) {
          return;
        }
        console.error("[ReviewEditor] draft failed", err);
        if (loadedVersionRef.current === version) {
          toast.error("AI 下書きの生成に失敗しました");
        }
        draftRequestedRef.current = null;
      } finally {
        if (loadedVersionRef.current === version) {
          setDraftLoading(false);
        }
      }
    })();
  }, [submission, update]);

  if (!submissionId || !submission) {
    return (
      <div className="p-7 text-center text-ink-3">
        <p className="mb-4">提出物が選択されていません。</p>
        <Button type="button" onClick={() => setPage("review-queue")}>
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

  const commentedLines = new Set(suggestions.filter((s) => s.adopted === true).map((s) => s.line));

  const handleFinalize = async (v: ReviewVerdict) => {
    if (finalizing) return;
    setFinalizing(true);
    try {
      let saved: Awaited<ReturnType<typeof finalize>>;
      try {
        saved = await finalize(submission.id, v, {
          reviewNotes: notes,
          aiSuggestions: suggestions,
          rubric,
        });
      } catch (err) {
        // 開いている間に学習者が引き継ぎ直した。 見えていないコードに確定させない。
        if (err instanceof SubmissionConflictError) {
          toast.error(err.message);
          setPage("review-queue");
          return;
        }
        throw err;
      }
      if (!saved) {
        toast.error("採点の保存に失敗しました");
        return;
      }
      setVerdict(v);
      const backend = isBackendConfigured();
      toast.success(
        v === "pass"
          ? backend
            ? "合格として確定しました（LMS通知を送信しました）"
            : "合格として確定しました（デモ: 通知はローカルのみ）"
          : v === "resubmit"
            ? backend
              ? "再提出を依頼しました（LMS通知を送信しました）"
              : "再提出を依頼しました"
            : backend
              ? "不合格として確定しました（LMS通知を送信しました）"
              : "不合格として確定しました",
      );
      setPage("review-queue");
    } finally {
      setFinalizing(false);
    }
  };

  const codeLines = submission.codeLines;

  return (
    <div className="flex flex-col min-h-[calc(100vh-57px)]">
      <div className="px-5 py-3.5 border-b border-border bg-card flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPage("review-queue")}
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
            {submission.sectionTitle ? ` / ${submission.sectionTitle}` : ""} · 提出{" "}
            {formatSubmittedAt(submission.submittedAt)} · {submission.attempt}回目
          </div>
        </div>
        <div className="flex-1" />
        {submission.gradingSummary && !submission.gradingSummary.cleared ? (
          <Badge variant="warning">
            <AlertTriangle size={10} />
            自動採点で未クリア
          </Badge>
        ) : null}
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
        <Button type="button" onClick={() => handleFinalize("resubmit")} disabled={finalizing}>
          <ThumbsDown size={13} />
          再提出
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={() => handleFinalize("pass")}
          disabled={finalizing}
        >
          <ThumbsUp size={13} />
          合格として確定
        </Button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 380px", minHeight: 0, flex: 1 }}>
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
                  // biome-ignore lint/suspicious/noArrayIndexKey: 行番号が同一性
                  key={i}
                  className={cn(
                    "flex gap-4 px-5 relative",
                    isCommented ? "code-viewer-commented" : "code-viewer-hover",
                  )}
                >
                  <div
                    className={cn(
                      "w-[30px] text-right shrink-0 select-none",
                      isCommented ? "code-viewer-ln-commented" : "code-viewer-ln",
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
              {submission.gradingSummary ? (
                <TabTrigger value="grade" icon={<AlertTriangle />}>
                  自動採点
                </TabTrigger>
              ) : null}
              <TabTrigger value="ai" icon={<Sparkles />} count={suggestions.length}>
                AI 下書き
              </TabTrigger>
              <TabTrigger value="rubric" icon={<Star />}>
                ルーブリック
              </TabTrigger>
              <TabTrigger value="comment" icon={<MessageCircle />}>
                総評
              </TabTrigger>
            </TabsList>

            {submission.gradingSummary ? (
              <TabsContent
                value="grade"
                className="mt-0 p-5 overflow-y-auto flex-1 data-[state=inactive]:hidden"
              >
                <GradeSummaryPanel summary={submission.gradingSummary} />
              </TabsContent>
            ) : null}

            <TabsContent
              value="ai"
              className="mt-0 p-5 overflow-y-auto flex-1 data-[state=inactive]:hidden"
            >
              <div className="flex gap-2.5 items-start bg-brand-soft border border-brand/30 rounded-md px-3.5 py-3 mb-3.5 text-[12.5px] text-brand-ink">
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
                    "border rounded-md p-3.5 mb-2.5 bg-card",
                    s.adopted === true && "border-success bg-success-soft",
                    s.adopted === false && "opacity-55",
                    s.adopted === null && "border-border",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5 text-[11.5px] font-semibold uppercase tracking-wider">
                    <span
                      className={cn("w-2 h-2 rounded-full inline-block", severityDot[s.severity])}
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
                  style={{ gridTemplateColumns: "1fr auto" }}
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
                          "w-[26px] h-[26px] rounded-[4px] grid place-items-center text-[11px] font-semibold",
                          r.score === n
                            ? "bg-brand text-white border border-brand"
                            : "border border-border-2 text-ink-3 bg-card hover:border-brand hover:text-brand",
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
                  variant={verdict === "pass" ? "primary" : "default"}
                  onClick={() => setVerdict("pass")}
                >
                  <Check size={13} />
                  合格
                </Button>
                <Button
                  type="button"
                  variant={verdict === "resubmit" ? "primary" : "default"}
                  onClick={() => setVerdict("resubmit")}
                >
                  再提出
                </Button>
                <Button
                  type="button"
                  variant={verdict === "fail" ? "primary" : "default"}
                  onClick={() => setVerdict("fail")}
                >
                  不合格
                </Button>
              </div>

              <Button
                type="button"
                variant="accent"
                className="w-full mb-3"
                onClick={() => verdict && handleFinalize(verdict)}
                disabled={!verdict || finalizing}
              >
                採点を確定
              </Button>

              <div className="flex gap-2.5 items-start bg-brand-soft border border-brand/30 rounded-md px-3.5 py-3 text-[12.5px] text-brand-ink">
                <Info size={14} />
                <div>
                  {isBackendConfigured()
                    ? "採点を確定すると受講者に LMS 通知が送られます（メールは送信しません）。"
                    : "採点を確定するとローカルに保存されます（デモ）。"}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
};

/**
 * VS Code から引き継がれた提出に付く自動採点の記録 (Issue #9)。
 * 講師が「どこで詰まったか」を最初に読めるように、 チェック → 失敗の詳細の順で出す。
 */
const GradeSummaryPanel = ({ summary }: { summary: GradingSummary }) => (
  <div className="text-[12.5px] leading-relaxed">
    <div className="flex gap-2.5 items-start bg-warning-soft border border-border rounded-md px-3.5 py-3 mb-3.5 text-warning">
      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
      <div>
        <strong className="font-semibold">学習者はここで詰まっています。</strong>
        VS Code の自動採点が
        {summary.cleared ? "通った状態で引き継がれました。" : "通らなかった提出です。"}
      </div>
    </div>

    <div className="flex gap-1.5 mb-4">
      <CheckBadge label="Lint" passed={summary.checks.lint} />
      <CheckBadge label="AST" passed={summary.checks.ast} />
      <CheckBadge label="テスト" passed={summary.checks.tests} />
    </div>

    <SummarySection title={`テスト (${summary.passedTestCount}/${summary.totalTestCount} 通過)`}>
      {summary.failedTests.length === 0 ? (
        <p className="text-ink-3">失敗したテストはありません。</p>
      ) : (
        <ul className="space-y-1.5">
          {summary.failedTests.map((test) => (
            <li key={test.name}>
              <span className="font-medium">{test.name}</span>
              {test.error ? <span className="text-ink-3"> — {test.error}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </SummarySection>

    {summary.lint.length > 0 ? (
      <SummarySection title="Lint エラー">
        <ul className="space-y-1.5">
          {summary.lint.map((violation) => (
            <li key={`${violation.line}:${violation.ruleId ?? ""}:${violation.message}`}>
              <span className="font-mono bg-muted text-ink-2 px-1.5 py-px rounded-[3px] text-[11px]">
                Line {violation.line}
              </span>{" "}
              {violation.message}
              {violation.ruleId ? <span className="text-ink-3"> ({violation.ruleId})</span> : null}
            </li>
          ))}
        </ul>
      </SummarySection>
    ) : null}

    {summary.ast.length > 0 ? (
      <SummarySection title="AST チェック">
        <ul className="space-y-1.5">
          {summary.ast.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </SummarySection>
    ) : null}

    {summary.errorMessage ? (
      <SummarySection title="実行エラー">
        <p className="whitespace-pre-wrap">{summary.errorMessage}</p>
      </SummarySection>
    ) : null}
  </div>
);

const CheckBadge = ({ label, passed }: { label: string; passed: boolean }) => (
  <Badge variant={passed ? "success" : "danger"}>
    {passed ? <Check size={10} /> : <X size={10} />}
    {label}
  </Badge>
);

const SummarySection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mb-4 last:mb-0">
    <h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-3 mb-1.5">
      {title}
    </h3>
    {children}
  </section>
);

/** 狭いサイドパネル用に等幅・小さめにするだけのレイアウトラッパー。配色は共通側。 */
const TabTrigger = (props: ComponentProps<typeof TabsTrigger>) => (
  <TabsTrigger {...props} className="flex-1 justify-center py-2.5 text-xs" />
);

function syntax(line: string): ReactNode {
  type Part = { t: string; cls: string | null };
  const patterns: Array<[RegExp, string]> = [
    [/\/\/[^\n]*/g, "tok-com"],
    [/"[^"]*"/g, "tok-str"],
    [/\b(const|let|var|function|if|else|for|return|new|class|this|of)\b/g, "tok-kw"],
    [/\b(true|false|null|undefined)\b/g, "tok-num"],
    [/\b\d+\b/g, "tok-num"],
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
      // biome-ignore lint/suspicious/noArrayIndexKey: ハイライト分割は位置が同一性
      <span key={i} className={p.cls}>
        {p.t}
      </span>
    ) : (
      p.t
    ),
  );
}
