import { useEffect, useMemo, useState } from "react";
import { CONFIDENCE_LABELS } from "@stella/shared/review/ai-review";
import {
  AI_PASSED_STATE_LABELS,
  AI_PASSED_STATES,
  type AiPassedRow,
  type AiPassedState,
  CHECK_RESULT_LABELS,
} from "@stella/shared/review/review-desk";
import type { Submission } from "@stella/shared/review/types";
import { ChevronRight } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAiPassed } from "@/lib/review-desk-api";

interface AiPassedListProps {
  /** 絞り込みの選択肢 (講座・課題・受講者) を作るのに使う、テナントの提出。 */
  submissions: Submission[];
  assignedOnly: boolean;
  onOpen: (submissionId: string) => void;
}

const SELECT =
  "h-8 rounded-sm border border-input bg-card px-2 text-[12.5px] min-w-[140px] max-w-[220px]";

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("ja-JP") : "-";
}

/**
 * AI が合格にした提出の事後確認の一覧 (#34、07 §6.4 の 6)。期間は限らない。
 * 講座・課題・受講者・確信度・日付で絞り込め、既定では確信度が「中」を先に並べる。
 */
export function AiPassedList({ submissions, assignedOnly, onOpen }: AiPassedListProps) {
  const [state, setState] = useState<AiPassedState>("unchecked");
  const [stageId, setStageId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [learnerId, setLearnerId] = useState("");
  const [confidence, setConfidence] = useState<"" | "high" | "medium">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState<{ rows: AiPassedRow[]; truncated: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 選択肢は、テナントの新形式の提出から作る (AI の合格が無い講座も選べてよい)。
  const options = useMemo(() => {
    const stages = new Map<string, string>();
    const tasks = new Map<string, { title: string; stageId: string | null }>();
    const learners = new Map<string, string>();
    for (const s of submissions) {
      if (!s.taskId) continue;
      if (s.stageId) stages.set(s.stageId, s.stageTitle);
      tasks.set(s.taskId, { title: s.assignmentTitle, stageId: s.stageId ?? null });
      if (s.studentId) learners.set(s.studentId, s.studentName);
    }
    const sorted = (map: Map<string, string>) =>
      [...map.entries()].sort(([, a], [, b]) => a.localeCompare(b, "ja"));
    return {
      stages: sorted(stages),
      tasks: [...tasks.entries()]
        .filter(([, t]) => !stageId || t.stageId === stageId)
        .map(([id, t]) => [id, t.title] as const)
        .sort(([, a], [, b]) => a.localeCompare(b, "ja")),
      learners: sorted(learners),
    };
  }, [submissions, stageId]);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    fetchAiPassed(
      {
        state,
        assignedOnly,
        ...(stageId ? { stageId } : {}),
        ...(taskId ? { taskId } : {}),
        ...(learnerId ? { learnerId } : {}),
        ...(confidence ? { confidence } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      },
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "一覧を読み込めませんでした");
      });
    return () => controller.abort();
  }, [state, stageId, taskId, learnerId, confidence, from, to, assignedOnly]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <fieldset className="flex items-center gap-1.5 border-0 p-0 m-0">
          <legend className="sr-only">確認の状態</legend>
          {AI_PASSED_STATES.map((s) => (
            <Chip key={s} active={state === s} onClick={() => setState(s)}>
              {AI_PASSED_STATE_LABELS[s]}
            </Chip>
          ))}
        </fieldset>
        <select
          aria-label="講座"
          className={SELECT}
          value={stageId}
          onChange={(e) => {
            setStageId(e.target.value);
            setTaskId("");
          }}
        >
          <option value="">すべての講座</option>
          {options.stages.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
        <select
          aria-label="課題"
          className={SELECT}
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
        >
          <option value="">すべての課題</option>
          {options.tasks.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
        <select
          aria-label="受講者"
          className={SELECT}
          value={learnerId}
          onChange={(e) => setLearnerId(e.target.value)}
        >
          <option value="">すべての受講者</option>
          {options.learners.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label="確信度"
          className={SELECT}
          value={confidence}
          onChange={(e) => setConfidence(e.target.value as "" | "high" | "medium")}
        >
          <option value="">すべての確信度</option>
          <option value="medium">中</option>
          <option value="high">高</option>
        </select>
        <label className="flex items-center gap-1 text-[12px] text-ink-3">
          AI 合格日
          <input
            type="date"
            aria-label="AI 合格日 (から)"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 rounded-sm border border-input bg-card px-2 text-[12.5px]"
          />
          〜
          <input
            type="date"
            aria-label="AI 合格日 (まで)"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 rounded-sm border border-input bg-card px-2 text-[12.5px]"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-destructive mb-3">{error}</p> : null}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>確信度</TableHead>
              <TableHead>受講者</TableHead>
              <TableHead>課題</TableHead>
              <TableHead>AI 合格日</TableHead>
              <TableHead>確認</TableHead>
              <TableHead>担当</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result === null ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-ink-3 py-10">
                  読み込んでいます…
                </TableCell>
              </TableRow>
            ) : result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-ink-3 py-10">
                  条件に合う AI の合格はありません
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((r) => (
                <TableRow key={r.submissionId} interactive onClick={() => onOpen(r.submissionId)}>
                  <TableCell>
                    {r.confidence ? (
                      <Badge variant={r.confidence === "medium" ? "warning" : "default"}>
                        {CONFIDENCE_LABELS[r.confidence]}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{r.studentName}</TableCell>
                  <TableCell>
                    <div>{r.taskTitle}</div>
                    <div className="text-[11.5px] text-ink-3">{r.stageTitle}</div>
                  </TableCell>
                  <TableCell className="text-ink-3">{formatDate(r.aiPassedAt)}</TableCell>
                  <TableCell>
                    {r.verdict !== "pass" ? (
                      <Badge variant="danger">覆した</Badge>
                    ) : r.lastCheck ? (
                      <Badge variant="success">
                        {CHECK_RESULT_LABELS[r.lastCheck.result]}
                        {r.lastCheck.reviewerName ? ` · ${r.lastCheck.reviewerName}` : ""}
                      </Badge>
                    ) : (
                      <span className="text-ink-3 text-[11.5px]">未確認</span>
                    )}
                  </TableCell>
                  <TableCell className="text-ink-3">{r.assigneeName ?? "-"}</TableCell>
                  <TableCell>
                    <ChevronRight size={14} className="text-ink-4" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      {result?.truncated ? (
        <p className="text-[12px] text-ink-3 mt-2">
          件数が多いため先頭だけを出しています。講座・課題・日付で絞り込んでください。
        </p>
      ) : null}
    </>
  );
}
