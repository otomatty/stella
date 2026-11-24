import { manualCompletionUrl } from "@/lib/manual-completion";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useMemo,
  type ComponentProps,
  type ReactNode,
} from "react";
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
  CheckCheck,
} from "@/lib/icons";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SUPPORT_LABELS } from "@stella/shared/tasks/submission-support";
import { formatGradingSummaryText } from "@stella/shared/review/grading-summary";
import {
  type EvidenceRef,
  FINDING_SEVERITY_LABELS,
  formatLearnerReply,
} from "@stella/shared/review/ai-review";
import type {
  GradingSummary,
  ReviewSuggestion,
  RubricCriterion,
  ReviewVerdict,
  Submission,
  SubmissionReference,
} from "@stella/shared/review/types";
import { useSubmission, useSubmissions } from "@/hooks/useSubmissions";
import { isBackendConfigured } from "@/lib/backend";
import { fetchReviewDraft } from "@/lib/review-draft-api";
import {
  SubmissionConflictError,
  formatSubmittedAt,
  refreshSubmission,
} from "@/lib/submissions-store";
import { isAiPassed, isAiResubmitted, passByLabel } from "@/lib/review-queue";
import {
  fetchSubmissionById,
  fetchSubmissionReference,
  referenceForSubmission,
} from "@/lib/submissions-api";
import { cn } from "@/lib/utils";
import { type CodeSegment, highlightSubmission } from "@/lib/submission-highlight";
import { alignReference } from "@/lib/reference-align";
import { rubricEvidenceByLine } from "@/lib/review-evidence";
import { LessonMarkdown } from "@/components/learner/MarkdownSlides";
import { AiReviewPanel } from "./AiReviewPanel";
import { CiRunPanel } from "./CiRunPanel";
import { CommentTemplatePicker } from "./CommentTemplatePicker";
import { PostCheckPanel } from "./PostCheckPanel";

/**
 * 提出の「版」。 学習者が同じ提出を引き継ぎ直すと id は据え置きでコードが変わるため、
 * id だけでは古い状態を握り続けてしまう。 `submittedAt` は引き継ぎ直しでのみ動く。
 */
function submissionVersion(submission: { id: string; submittedAt: number }): string {
  return `${submission.id}:${submission.submittedAt}`;
}

/** 壊れていて読めない記録の列名 → 表示名 (#34)。 */
const BROKEN_RECORD_LABELS: Record<string, string> = {
  machine_check: "照合の記録",
  local_result: "手元の実行結果",
  test_hashes: "テストのハッシュ",
  debugging_record: "修正の記録",
  support_log: "支援の記録",
  task_snapshot: "提出時の課題文",
  grading_summary: "自動の確認の記録",
};

const severityDot: Record<ReviewSuggestion["severity"], string> = {
  high: "bg-danger",
  med: "bg-warning",
  low: "bg-info",
};

const REFERENCE_VIEW_KEY = "stella_review_code_view";

function readReferenceView(): boolean {
  try {
    return localStorage.getItem(REFERENCE_VIEW_KEY) !== "submission";
  } catch {
    return true;
  }
}

interface ReviewEditorProps {
  submissionId: string | null;
  setPage: (page: string) => void;
}

export const ReviewEditor = ({ submissionId, setPage }: ReviewEditorProps) => {
  const submission = useSubmission(submissionId);
  const version = submission ? submissionVersion(submission) : null;
  const [loadedDetail, setLoadedDetail] = useState<{ version: string; detail: Submission }>();
  const taskDetail = loadedDetail?.version === version ? loadedDetail.detail : undefined;
  const fileSelectId = useId();
  const [selectedFile, setSelectedFile] = useState("");
  const [loadedReference, setLoadedReference] = useState<{
    version: string;
    reference: SubmissionReference;
  }>();
  const referenceResult = referenceForSubmission(
    loadedReference?.version === version ? loadedReference.reference : undefined,
    taskDetail?.submittedAt,
  );
  const reference = referenceResult?.available ? referenceResult : undefined;
  const [referenceView, setReferenceView] = useState(readReferenceView);
  const [referenceSelection, setReferenceSelection] = useState<{
    version: string | null;
    path: string;
  }>();
  const codeViewer = useRef<HTMLDivElement>(null);
  const [evidenceJump, setEvidenceJump] = useState<{
    version: string | null;
    target: EvidenceRef;
  }>();
  const activeJump =
    evidenceJump?.version === version && evidenceJump.target.file === selectedFile
      ? evidenceJump
      : undefined;

  useEffect(() => {
    if (!submission?.taskId || !version || submission.reviewSource === "manual") return;
    let current = true;
    void fetchSubmissionReference(submission.id)
      .then((reference) => {
        if (current) setLoadedReference({ version, reference });
      })
      .catch(() => {
        if (current) {
          setLoadedReference({
            version,
            reference: { available: false, reason: "参考の書き方を読み込めませんでした。" },
          });
        }
      });
    return () => {
      current = false;
    };
  }, [submission?.id, submission?.taskId, submission?.reviewSource, version]);

  useEffect(() => {
    if (!activeJump) return;
    codeViewer.current
      ?.querySelector(`[data-submission-line="${activeJump.target.startLine}"]`)
      ?.scrollIntoView({ block: "center", inline: "nearest" });
    const timer = window.setTimeout(() => setEvidenceJump(undefined), 2000);
    return () => window.clearTimeout(timer);
  }, [activeJump]);
  // 事後確認の操作のあとに取り直す (確認の記録・判定が変わる)。
  const [detailVersion, setDetailVersion] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: detailVersion は取り直しの合図
  useEffect(() => {
    if (!submission?.taskId || !version) return;
    let current = true;
    void fetchSubmissionById(submission.id)
      .then((detail) => {
        if (current) {
          setLoadedDetail({ version, detail });
          setSelectedFile((prev) =>
            detail.taskFiles?.some((f) => f.path === prev)
              ? prev
              : (detail.taskFiles?.[0]?.path ?? ""),
          );
        }
      })
      .catch(() => {
        if (current) toast.error("提出ファイルを読み出せませんでした");
      });
    return () => {
      current = false;
    };
  }, [submission?.id, submission?.taskId, detailVersion, version]);
  const reloadAfterCheck = useCallback(async () => {
    if (!submission) return;
    await refreshSubmission(submission.id);
    setDetailVersion((v) => v + 1);
  }, [submission]);
  const { update, finalize } = useSubmissions();

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
    // 新形式の提出は AI の一次レビュー (人に回した理由・所見・返信案) から読ませる。
    // AI が判定した提出は事後確認 (確認済み・コメント・覆す) から始める (#34)。
    setTab(
      submission.gradingSummary
        ? "grade"
        : isAiPassed(submission) || isAiResubmitted(submission)
          ? "check"
          : "ai",
    );
    setSuggestions(submission.aiSuggestions.map((s) => ({ ...s })));
    setRubric(submission.rubric.map((r) => ({ ...r })));
    setNotes(submission.reviewNotes);
    setVerdict(submission.verdict);
  }, [submission]);

  // 人に回した提出は、AI の返信案を総評の下書きにする (1 回の操作で確定できるように、#34)。
  // 講師がもう書いていれば上書きしない。使うのは解答例との照合を通した返信 (`learnerReply`) で、
  // AI の原文 (`draftReply`) は使わない (返信が解答例と重なって人に回った提出がある)。
  const draftReply = taskDetail?.aiReview?.learnerReply;
  const undecided = submission?.verdict === null;
  useEffect(() => {
    if (!undecided || !draftReply) return;
    setNotes((prev) => (prev.trim() ? prev : formatLearnerReply(draftReply)));
  }, [draftReply, undecided]);

  useEffect(() => {
    if (!submission || submission.aiReady || submission.taskId) return;
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
          stageTitle: submission.stageTitle,
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

  const sourceCode = submission?.taskId
    ? (taskDetail?.taskFiles?.find((file) => file.path === selectedFile)?.text ?? "")
    : (submission?.codeLines.join("\n") ?? "");
  const fallbackLanguage = submission?.taskId
    ? undefined
    : (submission?.gradingSummary?.language ?? "javascript");
  const sourceFilename = submission?.taskId ? selectedFile : "";
  const codeLines = useMemo(
    () => highlightSubmission(sourceCode, sourceFilename, fallbackLanguage),
    [sourceCode, sourceFilename, fallbackLanguage],
  );

  const fileLineCounts = useMemo(
    () => new Map(taskDetail?.taskFiles?.map(({ path, text }) => [path, text.split("\n").length])),
    [taskDetail?.taskFiles],
  );
  const evidenceLines = useMemo(
    () => rubricEvidenceByLine(taskDetail?.aiReview?.rubricResults, selectedFile, fileLineCounts),
    [taskDetail?.aiReview?.rubricResults, selectedFile, fileLineCounts],
  );
  const matchingReference = reference?.files.find((file) => file.path === selectedFile);
  const chooseReferenceFile = !matchingReference && (reference?.files.length ?? 0) > 1;
  const referenceFile = referenceView
    ? (matchingReference ??
      reference?.files.find(
        (file) => referenceSelection?.version === version && file.path === referenceSelection?.path,
      ) ??
      reference?.files[0])
    : undefined;
  const referenceLines = useMemo(
    () => (referenceFile ? highlightSubmission(referenceFile.text, referenceFile.path) : []),
    [referenceFile],
  );
  const alignedBlocks = useMemo(
    () =>
      referenceFile
        ? alignReference(codeLines, sourceFilename, referenceLines, referenceFile.path)
        : [],
    [codeLines, sourceFilename, referenceFile, referenceLines],
  );
  const setCodeView = (compare: boolean) => {
    setReferenceView(compare);
    try {
      localStorage.setItem(REFERENCE_VIEW_KEY, compare ? "reference" : "submission");
    } catch {
      // 保存できない環境でも、開いている画面では切り替えられる。
    }
  };

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

  if (submission.reviewSource === "manual")
    return (
      <div className="p-5 space-y-4">
        <Button type="button" variant="outline" onClick={() => setPage("review-queue")}>
          キューに戻る
        </Button>
        <h1 className="text-lg font-semibold">
          {submission.assignmentTitle} · {submission.studentName}
        </h1>
        <p>管理者が手で済みにしました</p>
        <p className="whitespace-pre-wrap break-words text-sm">
          理由: {taskDetail?.reviewNotes ?? submission.reviewNotes}
        </p>
        {(taskDetail?.stageId ?? submission.stageId) && submission.studentId ? (
          <a
            className="text-brand underline"
            href={manualCompletionUrl(
              (taskDetail?.stageId ?? submission.stageId) as string,
              submission.studentId,
            )}
          >
            手で済みを取り消す画面を開く
          </a>
        ) : null}
      </div>
    );

  const adopt = (id: string) =>
    setSuggestions((s) => s.map((x) => (x.id === id ? { ...x, adopted: true } : x)));
  const reject = (id: string) =>
    setSuggestions((s) => s.map((x) => (x.id === id ? { ...x, adopted: false } : x)));
  const setRubricScore = (id: string, score: number) =>
    setRubric((r) => r.map((x) => (x.id === id ? { ...x, score } : x)));

  const totalScore = rubric.reduce((a, r) => a + r.score, 0);
  const maxScore = rubric.reduce((a, r) => a + r.max, 0);
  const pct = maxScore ? Math.round((totalScore / maxScore) * 100) : 0;

  const lineMarks: SubmissionLineMarks = {
    commentedLines: new Set(suggestions.filter((s) => s.adopted === true).map((s) => s.line)),
    evidenceLines,
    activeEvidence: activeJump?.target,
  };

  // まだ誰も確定していない提出は「確定しなかったときだけ確定」にする (別の講師が先に確定して
  // いれば 409 でキューに戻す)。確定済みの提出の訂正は従来どおり上書きする。
  const aiVerdict = isAiPassed(submission)
    ? "pass"
    : isAiResubmitted(submission)
      ? "resubmit"
      : null;
  const testsLocked = submission.reviewSource === "tests";
  // 問題の相談は合格にできない (課題の合格は全問の提出だけ。API も 409)。
  const problemConsult = !testsLocked && Boolean(taskDetail?.localResult?.problemId);
  const wasAiConfirmed = Boolean(submission.taskId) && submission.aiReviewStatus === "confirmed";
  const proposal = taskDetail?.aiReview?.proposedVerdict ?? submission.aiProposedVerdict ?? null;
  const handleFinalize = async (v: ReviewVerdict) => {
    if (finalizing || (submission.taskId && !taskDetail)) return;
    setFinalizing(true);
    try {
      let saved: Awaited<ReturnType<typeof finalize>>;
      try {
        saved = await finalize(
          submission.id,
          v,
          {
            reviewNotes: notes,
            aiSuggestions: suggestions,
            rubric,
          },
          { expectUndecided: submission.verdict === null },
        );
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
        toast.error("レビューの保存に失敗しました");
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

  // 提出時の課題・実行結果・記録は一覧に載らないので、詳細 (taskDetail) から読む。
  const taskText = taskDetail?.taskSnapshot?.files["README.md"];
  const taskDescription = taskText
    ? new TextDecoder().decode(Uint8Array.from(atob(taskText), (c) => c.charCodeAt(0)))
    : "";

  return (
    <div className="flex flex-col min-h-[calc(100vh-57px)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-card px-4 py-3 sm:px-5 sm:py-3.5 lg:flex-nowrap">
        <button
          type="button"
          onClick={() => setPage("review-queue")}
          className="flex shrink-0 items-center gap-2 whitespace-nowrap cursor-pointer text-ink-3 hover:text-foreground"
        >
          <ChevronLeft size={14} />
          <span className="text-[11.5px]">キューに戻る</span>
        </button>
        <div className="hidden w-px h-5 bg-border mx-1.5 sm:block" />
        <div className="min-w-0 flex-1 basis-[12rem]">
          <div className="break-words text-sm font-semibold">
            {submission.assignmentTitle} · {submission.studentName}
          </div>
          <div className="break-words text-[11.5px] text-ink-3">
            {submission.stageTitle}
            {submission.sectionTitle ? ` / ${submission.sectionTitle}` : ""} · 提出{" "}
            {formatSubmittedAt(submission.submittedAt)} · {submission.attempt}回目
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:ml-auto lg:w-auto lg:gap-3">
          {submission.gradingSummary && !submission.gradingSummary.cleared ? (
            <Badge variant="warning">
              <AlertTriangle size={10} />
              自動の確認で不合格
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
          {passByLabel(submission) === "テストで確認" ? (
            <Badge variant="success">テストで確認</Badge>
          ) : null}
          {testsLocked ? null : aiVerdict ? (
            <>
              <Badge variant={aiVerdict === "pass" ? "success" : "warning"}>
                <Sparkles size={10} />
                {aiVerdict === "pass" ? "AI で合格" : "AI で再提出"}
              </Badge>
              {/* 狭幅では事後確認のボタンに行全体を使えるようにする。 */}
              <span aria-hidden="true" className="basis-full sm:hidden" />
              <Button
                type="button"
                variant="primary"
                className="max-sm:flex-1"
                onClick={() => setTab("check")}
              >
                <CheckCheck size={13} />
                事後確認
              </Button>
            </>
          ) : (
            <>
              {!problemConsult &&
              submission.verdict === null &&
              proposal &&
              submission.reviewSource !== "tests" ? (
                <Badge variant={proposal === "pass" ? "success" : "warning"}>
                  AI の判定案: {proposal === "pass" ? "合格" : "再提出"}
                </Badge>
              ) : null}
              {/* 狭幅では判定ボタンが同じ行で幅を等分できるようにする。 */}
              <span aria-hidden="true" className="basis-full sm:hidden" />
              <Button
                type="button"
                className="max-sm:flex-1"
                variant={
                  submission.verdict === null && proposal === "resubmit" ? "primary" : "default"
                }
                onClick={() => handleFinalize("resubmit")}
                disabled={finalizing || (!!submission.taskId && !taskDetail)}
                title="総評 (所見を直した文) を添えて再提出にします"
              >
                <ThumbsDown size={13} />
                {submission.verdict === null ? "再提出にする" : "再提出"}
              </Button>
              {problemConsult ? null : (
                <Button
                  type="button"
                  className="max-sm:flex-1"
                  variant={
                    submission.verdict === null && proposal === "resubmit" ? "default" : "primary"
                  }
                  onClick={() => handleFinalize("pass")}
                  disabled={finalizing || (!!submission.taskId && !taskDetail)}
                >
                  <ThumbsUp size={13} />
                  {submission.verdict === null && proposal === "pass"
                    ? "判定案どおり合格"
                    : "合格として確定"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-1",
          !testsLocked && "lg:grid-cols-[minmax(0,1fr)_380px]",
        )}
      >
        <div className="min-w-0 overflow-hidden flex flex-col">
          {submission.taskId ? (
            <div className="p-4 sm:p-5 border-b border-border max-h-80 overflow-auto">
              <details>
                <summary>提出時の課題文</summary>
                <pre className="whitespace-pre-wrap font-sans text-sm">{taskDescription}</pre>
              </details>
              <p className="text-sm mt-3">
                {!taskDetail
                  ? "提出内容を読み込んでいます"
                  : taskDetail.machineCheck?.matched &&
                      (!taskDetail.machineCheck.ci ||
                        taskDetail.machineCheck.ci.status === "verified")
                    ? "機械の照合は一致しました"
                    : "管理者の確認が必要です"}
              </p>
              {taskDetail?.brokenRecords?.length ? (
                // 壊れた記録は空として表示している。合否は講師が提出ファイルを見て決める (#34)。
                <p className="text-sm text-warning mt-1 flex items-center gap-1">
                  <AlertTriangle size={13} />
                  {taskDetail.brokenRecords
                    .map((column) => BROKEN_RECORD_LABELS[column] ?? column)
                    .join("・")}
                  を読めません。提出ファイルを見て判定してください。
                </p>
              ) : null}
              {taskDetail?.machineCheck?.reasons.map((reason) => (
                <p className="text-sm text-warning" key={reason}>
                  {reason}
                </p>
              ))}
              {taskDetail ? (
                <CiRunPanel
                  check={taskDetail.machineCheck?.ci}
                  claim={taskDetail.localResult?.ci}
                />
              ) : null}
              <p className="whitespace-pre-wrap text-sm mt-3">{submission.explanation}</p>
              {taskDetail?.debuggingRecord
                ? Object.entries(taskDetail.debuggingRecord).map(([key, value]) => (
                    <p key={key} className="whitespace-pre-wrap text-sm">
                      {
                        {
                          reproduction: "再現",
                          expected: "期待と実際",
                          cause: "原因",
                          fix: "修正",
                          regression: "回帰確認",
                        }[key as keyof NonNullable<Submission["debuggingRecord"]>]
                      }
                      : {value}
                    </p>
                  ))
                : null}
              <p className="text-sm mt-3">
                支援:{" "}
                {taskDetail
                  ? taskDetail.supportLog?.map((e) => SUPPORT_LABELS[e.kind]).join(" / ") || "なし"
                  : ""}
              </p>
              {taskDetail?.localResult?.steps.map((step) => (
                <p className="text-sm" key={step.id}>
                  {step.label}: {step.summary}
                </p>
              ))}
              <label htmlFor={fileSelectId} className="block text-sm mt-3">
                {submission.reviewSource === "tests" ? "問題のファイル" : "提出ファイル"}{" "}
                <NativeSelect
                  id={fileSelectId}
                  value={selectedFile}
                  onChange={(e) => {
                    setEvidenceJump(undefined);
                    setSelectedFile(e.target.value);
                  }}
                  size="sm"
                >
                  {taskDetail?.taskFiles?.map((f) => (
                    <option value={f.path} key={f.path}>
                      {f.path}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            </div>
          ) : submission.explanation ? (
            <p className="p-4 sm:p-5 border-b border-border whitespace-pre-wrap text-sm">
              {submission.explanation}
            </p>
          ) : null}
          <div className="px-4 sm:px-5 py-2.5 border-b border-border bg-card flex flex-wrap items-center gap-1.5">
            <Badge>提出コード</Badge>
            <span className="text-[11.5px] text-ink-3">{codeLines.length}行</span>
            <div className="flex-1" />
            {evidenceLines.size > 0 ? (
              <span className="flex items-center gap-1 text-[11.5px] text-ink-3">
                <span aria-hidden="true" className="size-3 rounded-sm bg-warning-soft" />
                AI が根拠にした行
              </span>
            ) : null}
            {reference?.files.length ? (
              <fieldset
                aria-label="コードの表示"
                className="inline-flex min-w-0 gap-0.5 rounded-md border border-border bg-muted p-0.5"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={referenceView ? "ghost" : "default"}
                  aria-pressed={!referenceView}
                  onClick={() => setCodeView(false)}
                >
                  提出だけ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={referenceView ? "default" : "ghost"}
                  aria-pressed={referenceView}
                  onClick={() => setCodeView(true)}
                >
                  参考と並べる
                </Button>
              </fieldset>
            ) : null}
          </div>
          {referenceResult && (!referenceResult.available || !referenceResult.files.length) ? (
            <p
              role="status"
              className="px-4 sm:px-5 py-2 text-xs text-ink-3 border-b border-border"
            >
              {referenceResult.available
                ? "この課題の解答例が見つかりません。"
                : referenceResult.reason}
            </p>
          ) : null}
          {referenceFile && reference ? (
            <div className="grid min-w-0 grid-cols-1 border-b border-border bg-card lg:grid-cols-2">
              <div className="hidden px-4 sm:px-5 py-2 text-xs font-semibold lg:block">
                提出コード
              </div>
              <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 px-4 sm:px-5 py-2 text-xs lg:border-l lg:border-border">
                <span className="font-semibold text-brand-ink">参考の書き方</span>
                <span className="min-w-0 break-words text-ink-3">
                  解答例 ·{" "}
                  {reference.version === "submitted"
                    ? "提出時のバージョン"
                    : (reference.note ?? "今のバージョン")}{" "}
                  · 受講者には表示しません
                </span>
                {chooseReferenceFile ? (
                  <NativeSelect
                    aria-label="参考のファイル"
                    size="sm"
                    value={referenceFile.path}
                    onChange={(e) => setReferenceSelection({ version, path: e.target.value })}
                  >
                    {reference.files.map(({ path }) => (
                      <option key={path} value={path}>
                        {path}
                      </option>
                    ))}
                  </NativeSelect>
                ) : null}
              </div>
            </div>
          ) : null}
          <div
            ref={codeViewer}
            className={cn(
              "flex-1 overflow-auto font-mono text-[12.5px] leading-[1.6] code-viewer-bg max-lg:max-h-[60vh]",
              referenceFile ? "lg:max-h-[calc(100vh-14rem)]" : "py-3.5",
            )}
          >
            {referenceFile
              ? alignedBlocks.map(({ submitted, reference: counterpart }) => (
                  <div
                    key={submitted?.startLine ?? `reference-${counterpart?.startLine}`}
                    className="grid grid-cols-1 border-b border-border/60 last:border-b-0 lg:grid-cols-2"
                  >
                    <div
                      className={cn(
                        "min-w-0 overflow-x-auto py-2",
                        !submitted && "hidden lg:block",
                      )}
                    >
                      {submitted ? (
                        <>
                          <div className="px-4 sm:px-5 text-xs font-sans text-white/70 lg:hidden">
                            提出
                          </div>
                          {renderCodeLines(
                            codeLines,
                            submitted.startLine,
                            submitted.endLine,
                            lineMarks,
                          )}
                        </>
                      ) : null}
                    </div>
                    <div className="min-w-0 overflow-x-auto border-t border-border/60 bg-brand/5 py-2 lg:border-l lg:border-t-0">
                      <div className="px-4 sm:px-5 text-xs font-sans text-white/70 lg:hidden">
                        参考
                      </div>
                      {counterpart ? (
                        renderCodeLines(referenceLines, counterpart.startLine, counterpart.endLine)
                      ) : (
                        <p className="px-4 sm:px-5 font-sans text-xs text-white/60">
                          参考にはありません
                        </p>
                      )}
                    </div>
                  </div>
                ))
              : renderCodeLines(codeLines, 1, codeLines.length, lineMarks)}
          </div>
        </div>

        {testsLocked ? null : (
          <aside className="border-t border-border bg-card flex flex-col overflow-hidden lg:border-t-0 lg:border-l lg:max-h-[calc(100vh-57px-64px)]">
            <Tabs value={tab} onValueChange={setTab} className="flex flex-col min-h-0 flex-1">
              <TabsList className="border-b border-border flex px-0 gap-0 m-0">
                {submission.gradingSummary ? (
                  <TabTrigger value="grade" icon={<AlertTriangle />}>
                    自動の確認
                  </TabTrigger>
                ) : null}
                {wasAiConfirmed ? (
                  <TabTrigger value="check" icon={<CheckCheck />}>
                    事後確認
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
                  className="mt-0 p-4 sm:p-5 overflow-y-auto flex-1 data-[state=inactive]:hidden"
                >
                  <GradeSummaryPanel summary={submission.gradingSummary} />
                </TabsContent>
              ) : null}

              {wasAiConfirmed ? (
                <TabsContent
                  value="check"
                  className="mt-0 p-4 sm:p-5 overflow-y-auto flex-1 data-[state=inactive]:hidden"
                >
                  <PostCheckPanel
                    submissionId={submission.id}
                    aiVerdict={aiVerdict}
                    checks={taskDetail?.checks}
                    stageId={submission.stageId}
                    pattern={submission.taskPattern}
                    onChanged={reloadAfterCheck}
                  />
                </TabsContent>
              ) : null}

              <TabsContent
                value="ai"
                className="mt-0 p-4 sm:p-5 overflow-y-auto flex-1 data-[state=inactive]:hidden"
              >
                <div className="flex gap-2.5 items-start bg-brand-soft border border-brand/30 rounded-md px-3.5 py-3 mb-3.5 text-[12.5px] text-brand-ink">
                  <Sparkles size={15} className="shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">AIは下書きです。</strong>
                    採用・却下・編集を行い、管理者の判断で最終確定してください。完全自動化はしません。
                  </div>
                </div>

                {submission.taskId ? (
                  <AiReviewPanel
                    status={taskDetail?.aiReviewStatus ?? submission.aiReviewStatus}
                    review={taskDetail?.aiReview}
                    fileLineCounts={fileLineCounts}
                    onJumpToEvidence={(target) => {
                      setSelectedFile(target.file);
                      setEvidenceJump({ version, target });
                    }}
                    onUseReply={(text) => {
                      setNotes(text);
                      setTab("comment");
                    }}
                    onUseFindings={(findings) => {
                      // 所見を総評に入れて直し、再提出にする (07 §6.4 の 3)。
                      const lines = findings.map(
                        (f) =>
                          `- ${f.file} ${f.startLine}${f.endLine !== f.startLine ? `〜${f.endLine}` : ""}行 (${FINDING_SEVERITY_LABELS[f.severity]}): ${f.comment}`,
                      );
                      setNotes((prev) =>
                        [prev.trim(), ["直してほしいところ", ...lines].join("\n")]
                          .filter(Boolean)
                          .join("\n\n"),
                      );
                      setTab("comment");
                    }}
                  />
                ) : null}

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
                {reference?.reviewGuide.trim() ? (
                  <details className="mt-4 rounded-md border border-border p-3">
                    <summary className="cursor-pointer text-xs font-semibold">
                      この課題のレビューの観点 (private/review.md)
                    </summary>
                    <div className="mt-3 break-words">
                      <LessonMarkdown>{reference.reviewGuide}</LessonMarkdown>
                    </div>
                  </details>
                ) : null}
              </TabsContent>

              <TabsContent
                value="rubric"
                className="mt-0 p-4 sm:p-5 overflow-y-auto flex-1 data-[state=inactive]:hidden"
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
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5 border-b border-border last:border-b-0"
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
                className="mt-0 p-4 sm:p-5 overflow-y-auto flex-1 data-[state=inactive]:hidden"
              >
                {!isBackendConfigured() ? null : aiVerdict ? (
                  <p className="text-[12px] text-ink-3 mb-3">
                    AI が判定した提出の総評は AI
                    の返信です。コメントを足す・覆すときは「事後確認」から行ってください。
                  </p>
                ) : (
                  <CommentTemplatePicker
                    stageId={submission.stageId}
                    pattern={submission.taskPattern}
                    currentText={notes}
                    onInsert={(body) =>
                      setNotes((prev) => (prev.trim() ? `${prev}\n\n${body}` : body))
                    }
                  />
                )}
                <Label>総評コメント（受講者に通知されます）</Label>
                <Textarea
                  className="min-h-[160px] mb-3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                <Label>判定</Label>
                {problemConsult ? (
                  <p className="text-[12px] text-ink-3">
                    問題の相談は合格にできません。返信は「再提出」で送ります。
                  </p>
                ) : null}
                <div className="flex gap-2 mb-4">
                  {problemConsult ? null : (
                    <Button
                      type="button"
                      variant={verdict === "pass" ? "primary" : "default"}
                      onClick={() => setVerdict("pass")}
                    >
                      <Check size={13} />
                      合格
                    </Button>
                  )}
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
                  disabled={
                    !verdict ||
                    aiVerdict !== null ||
                    finalizing ||
                    (!!submission.taskId && !taskDetail)
                  }
                >
                  レビューを確定
                </Button>

                <div className="flex gap-2.5 items-start bg-brand-soft border border-brand/30 rounded-md px-3.5 py-3 text-[12.5px] text-brand-ink">
                  <Info size={14} />
                  <div>
                    {isBackendConfigured()
                      ? "レビューを確定すると受講者に LMS 通知が送られます（メールは送信しません）。"
                      : "レビューを確定するとローカルに保存されます（デモ）。"}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </aside>
        )}
      </div>
    </div>
  );
};

interface SubmissionLineMarks {
  commentedLines: ReadonlySet<number>;
  evidenceLines: ReadonlyMap<number, ReadonlySet<string>>;
  activeEvidence: EvidenceRef | undefined;
}

function renderCodeLines(
  lines: CodeSegment[][],
  startLine: number,
  endLine: number,
  marks?: SubmissionLineMarks,
) {
  return (
    <div className="min-w-full w-max">
      {lines.slice(startLine - 1, endLine).map((segments, index) => {
        const line = startLine + index;
        const isCommented = marks?.commentedLines.has(line);
        const evidenceLabels = marks?.evidenceLines.get(line);
        const active = marks?.activeEvidence;
        const isJumped = active && line >= active.startLine && line <= active.endLine;
        return (
          <div
            key={line}
            data-submission-line={marks ? line : undefined}
            className={cn(
              "relative flex items-baseline gap-4 px-4 sm:px-5",
              evidenceLabels
                ? "bg-warning-soft"
                : isCommented
                  ? "code-viewer-commented"
                  : "code-viewer-hover",
              isJumped && "ring-1 ring-inset ring-warning",
            )}
          >
            <div
              className={cn(
                "w-[30px] text-right shrink-0 select-none",
                isCommented ? "code-viewer-ln-commented" : "code-viewer-ln",
              )}
            >
              {line}
            </div>
            <code className="flex-1 whitespace-pre">
              {segments.map((segment, tokenIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: トークンの位置が同一性
                <span key={tokenIndex} className={segment.className || undefined}>
                  {segment.text}
                </span>
              ))}
            </code>
            {isCommented && !evidenceLabels?.size ? (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 code-comment-indicator text-[10px] px-1.5 py-[1px] rounded-lg font-semibold">
                レビュー
              </span>
            ) : null}
            {evidenceLabels?.size ? (
              <div className="sticky right-2 flex shrink-0 items-center gap-1.5 whitespace-nowrap font-sans text-[10px] font-semibold">
                {isCommented ? (
                  <span className="code-comment-indicator rounded-lg px-1.5">レビュー</span>
                ) : null}
                {[...evidenceLabels].map((label) => (
                  <span
                    key={label}
                    className="rounded-lg border border-warning/50 bg-card px-1.5 text-warning"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * VS Code から引き継がれた提出に付く自動採点の記録 (Issue #9)。
 * 講師が「どこで詰まったか」を最初に読めるように、 チェック → 失敗の詳細の順で出す。
 */
const GradeSummaryPanel = ({ summary }: { summary: GradingSummary }) => (
  <div className="text-[12.5px] leading-relaxed">
    <div className="flex gap-2.5 items-start bg-warning-soft border border-border rounded-md px-3.5 py-3 mb-3.5 text-warning">
      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
      <div>
        <strong className="font-semibold">受講者はここで詰まっています。</strong>
        VS Code の自動の確認が
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
