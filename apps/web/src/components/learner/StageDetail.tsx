import {
  ChevronLeft,
  ChevronRight,
  User,
  Video,
  Clock,
  Calendar,
  Play,
  Download,
  CheckCircle,
  Circle,
  Lock,
  FileText,
  HelpCircle,
  Upload,
  Terminal,
  Book,
  Presentation,
  Code,
  Loader2,
} from "@/lib/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import type { StageCompletion } from "@stella/shared/cms/types";
import type { TaskSummary } from "@stella/shared/tasks/catalog";
import { StageThumb } from "@/components/common/StageThumb";
import { StageMaterialsDialog } from "@/components/learner/StageMaterialsDialog";
import { TaskList } from "./TaskList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardActions } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Stage, Lesson, LessonStatus, LessonType } from "@/data/types";
import { useIsHandheld } from "@/hooks/useIsHandheld";
import { useLessonProgressMap } from "@/hooks/useLessonProgress";
import { useMySubmissions } from "@/hooks/useMySubmissions";
import { isBackendConfigured } from "@/lib/backend";
import { fetchMyStageCompletion } from "@/lib/certificates-api";
import { findNextLesson, resolveLessonStatus, resumeLessonId } from "@/lib/lesson-progress";
import { stageWrapupOf } from "@/lib/stage-wrapup";
import { cn } from "@/lib/utils";
import { openInVscode } from "@/lib/vscode-launch";

type LucideIcon = ComponentType<LucideProps>;

const lessonTypeIcon: Record<LessonType, LucideIcon> = {
  video: Video,
  slides: Presentation,
  text: FileText,
  quiz: HelpCircle,
  assignment: Upload,
  code: Terminal,
};

/** レッスン種別の表示名。 バッジ・前後ナビなど受講者向けの表示で共有する。 */
export const lessonTypeLabel: Record<LessonType, string> = {
  video: "動画",
  slides: "スライド",
  text: "テキスト",
  quiz: "小テスト",
  assignment: "課題",
  code: "コーディング課題",
};

export const LessonTypeIcon = ({ type, size = 14 }: { type: LessonType; size?: number }) => {
  const Icon = lessonTypeIcon[type];
  return <Icon size={size} />;
};

export const LessonStatusIcon = ({ status }: { status: LessonStatus }) => {
  if (status === "done") return <CheckCircle size={15} className="text-success" />;
  if (status === "locked") return <Lock size={13} className="text-ink-4" />;
  if (status === "active")
    return (
      <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand mt-1 ml-[3px] animate-lms-pulse" />
    );
  return <Circle size={14} />;
};

interface StageDetailProps {
  stage: Stage;
  setPage: (page: string) => void;
  /** 指定のレッスンでレッスン画面を開く。 */
  onOpenLesson: (lessonId: string) => void;
  onOpenSubmission?: (submissionId: string) => void;
  /** 課題の文脈で AI チャットを開く (#38)。 */
  onAskAiAboutTask?: (task: { id: string; title: string }) => void;
}

export const StageDetail = ({
  stage,
  setPage,
  onOpenLesson,
  onOpenSubmission,
  onAskAiAboutTask,
}: StageDetailProps) => {
  const sections = stage.sections ?? [];
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const { submissions } = useMySubmissions(true);
  // 完了数は fixture の初期 status ではなく進捗ストア (サーバ同期済み) で解決する。
  const progressMap = useLessonProgressMap();
  const statusOf = (l: Lesson) => resolveLessonStatus(l, progressMap);
  const totalLessons = sections.reduce((a, s) => a + s.lessons.length, 0) || stage.lessonsCount;
  const doneLessons = sections.reduce(
    (a, s) => a + s.lessons.filter((l) => statusOf(l) === "done").length,
    0,
  );
  // 「続きから」 の再開位置 (最初の未完了レッスン)。 レッスンが無いステージでは null。
  const resumeId = resumeLessonId(stage, progressMap);

  /**
   * 新形式の課題の一覧 (`TaskList` が読んだもの。旧形式・未取得は null)。レッスンを終えても
   * 課題が合格していなければクリアにならないので、受講者の番の課題があれば主ボタンを
   * 「続きから」ではなく「課題に取り組む」にする。
   *
   * 読んだステージと一緒に持ち、いま開いているステージのものだけを使う。ステージ詳細から
   * 別のステージへ移ると、このコンポーネントは作り直されずに残るため — 前のステージの課題で
   * 「課題に取り組む」を出さない (旧形式のステージでは一覧を読み直さないので、なおさら)。
   */
  const [loadedTasks, setLoadedTasks] = useState<{
    stageId: string;
    tasks: TaskSummary[];
  } | null>(null);
  const tasks = loadedTasks?.stageId === stage.id ? loadedTasks.tasks : null;
  const wrapup = useMemo(() => (tasks ? stageWrapupOf(tasks) : null), [tasks]);
  const lessonsLeft = findNextLesson(stage, progressMap) !== null;
  const handheld = useIsHandheld();
  const taskTurn =
    !stage.completed &&
    !lessonsLeft &&
    wrapup?.learnerTurn &&
    // スマートフォン・タブレットは課題文のレッスン (リンクをパソコンへ送るボタン) へ送る。
    (!handheld || wrapup.task.lessonId)
      ? wrapup
      : null;
  const [launching, setLaunching] = useState(false);
  const startTask = async () => {
    if (!taskTurn) return;
    if (handheld) {
      if (taskTurn.task.lessonId) onOpenLesson(taskTurn.task.lessonId);
      return;
    }
    setLaunching(true);
    try {
      await openInVscode({ taskId: taskTurn.task.id });
    } finally {
      setLaunching(false);
    }
  };

  /**
   * 修了条件ごとの達成状況 (サーバーの判定と同じ数)。新形式は課題の一覧を読み直すたび
   * (ウィンドウに戻ったとき・「状態を更新」) に取り直す。取れなければ条件だけを出す。
   */
  const [loadedCompletion, setCompletion] = useState<StageCompletion | null>(null);
  // 前に開いていたステージの判定は出さない (上の課題の一覧と同じ理由)。
  const completion = loadedCompletion?.stage_id === stage.id ? loadedCompletion : null;
  const completionRequest = useRef(0);
  const loadCompletion = useCallback(() => {
    if (!isBackendConfigured()) return;
    const request = ++completionRequest.current;
    fetchMyStageCompletion(stage.id)
      .then((value) => {
        if (request === completionRequest.current) setCompletion(value);
      })
      .catch(() => {
        if (request === completionRequest.current) setCompletion(null);
      });
  }, [stage.id]);
  // 新形式は課題の一覧が届いたとき (下の handleTasksLoaded) に読む。旧形式はここで 1 回。
  useEffect(() => {
    if (stage.format !== 2) loadCompletion();
    return () => {
      completionRequest.current += 1;
    };
  }, [stage.format, loadCompletion]);
  const handleTasksLoaded = useCallback(
    (loaded: TaskSummary[], loadedStageId: string) => {
      setLoadedTasks({ stageId: loadedStageId, tasks: loaded });
      loadCompletion();
    },
    [loadCompletion],
  );
  const criteriaRows = stage.criteria
    ? [
        stage.criteria.requireAllLessons
          ? {
              key: "lessons",
              label: "全レッスンの完了",
              done: completion?.completed_lessons,
              total: completion?.total_lessons,
            }
          : null,
        stage.criteria.requireQuizPass
          ? {
              key: "quizzes",
              label: "全小テストの合格",
              done: completion?.passed_quizzes,
              total: completion?.total_quizzes,
            }
          : null,
        stage.criteria.requireAssignmentPass
          ? {
              key: "assignments",
              label: "全課題「合格」判定",
              done: completion?.passed_assignments,
              total: completion?.total_assignments,
            }
          : null,
      ].filter((row) => row !== null)
    : [];
  const reviewedForLesson = (lesson: Lesson) =>
    submissions.find((submission) => {
      if (submission.status === "pending" || submission.stageTitle !== stage.title) return false;
      if (submission.assignmentId) {
        return Boolean(lesson.assignmentId && submission.assignmentId === lesson.assignmentId);
      }
      return submission.assignmentTitle === lesson.title;
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setPage("dash")}
        className="flex items-center gap-1 mb-4 text-ink-3 text-[12.5px] hover:text-foreground"
      >
        <ChevronLeft size={14} />
        <span>スキルツリーに戻る</span>
      </button>

      <div className="grid gap-6 items-start grid-cols-1 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="accent">{stage.category}</Badge>
            <span className="text-[11.5px] text-ink-3">カテゴリ</span>
          </div>
          <h1 className="text-[26px] tracking-tight font-semibold mb-2.5">{stage.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-ink-3 text-[13px] mb-6">
            {stage.enrolledBy ? (
              <span className="flex items-center gap-1">
                <User size={13} /> {stage.enrolledBy}
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <Video size={13} /> {totalLessons}レッスン
            </span>
            {stage.duration != null ? (
              <span className="flex items-center gap-1">
                <Clock size={13} /> 約{stage.duration}時間
              </span>
            ) : null}
            {stage.dueAt ? (
              <span className="flex items-center gap-1">
                <Calendar size={13} /> 提出期限 {stage.dueAt}
              </span>
            ) : null}
          </div>

          {stage.description ? (
            <p className="text-sm leading-relaxed text-ink-2 mb-7 max-w-[720px]">
              {stage.description}
            </p>
          ) : null}

          {stage.format === 2 ? (
            <TaskList stageId={stage.id} onAskAi={onAskAiAboutTask} onLoaded={handleTasksLoaded} />
          ) : null}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>シラバス</CardTitle>
              <CardActions>
                <span className="text-[11.5px] text-ink-3">
                  {doneLessons} / {totalLessons} 完了
                </span>
              </CardActions>
            </CardHeader>
            <div>
              {sections.map((s) => (
                <div key={s.id}>
                  <div className="px-4 py-3 border-b border-border bg-sunken text-[12.5px] font-semibold flex items-center gap-2.5">
                    <span>{s.title}</span>
                    <span className="text-[11.5px] text-ink-3 font-normal ml-auto">
                      {s.lessons.filter((l) => statusOf(l) === "done").length} / {s.lessons.length}{" "}
                      完了
                    </span>
                  </div>
                  {s.lessons.map((l) => {
                    const reviewedSubmission = reviewedForLesson(l);
                    const status = statusOf(l);
                    return (
                      <LessonRow
                        key={l.id}
                        lesson={l}
                        status={status}
                        onClick={() => status !== "locked" && onOpenLesson(l.id)}
                        reviewedSubmissionId={reviewedSubmission?.id}
                        onOpenSubmission={onOpenSubmission}
                      />
                    );
                  })}
                </div>
              ))}
              {sections.length === 0 ? (
                <div className="text-center py-12 text-ink-3 text-sm">
                  <div className="w-10 h-10 rounded-full bg-sunken grid place-items-center text-ink-3 mx-auto mb-3">
                    <Book size={18} />
                  </div>
                  シラバスはまもなく公開されます
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="sticky top-[88px]">
          <Card className="mb-4">
            <div className="relative border-b border-border" style={{ aspectRatio: "16 / 10" }}>
              {/* 枠は 16:10、サムネイル自体は 16:9 なので fill で枠に合わせる。 */}
              <StageThumb
                fill
                color={stage.color}
                label={stage.category}
                thumbnailPath={stage.thumbnailPath}
              />
            </div>
            <CardContent>
              <div className="text-[11.5px] text-ink-3 mb-2">あなたの進捗</div>
              <div className="text-[32px] tracking-tight font-semibold">
                {stage.progress}
                <span className="text-sm text-ink-3 font-normal">%</span>
              </div>
              <Progress value={stage.progress} tone="brand" className="mt-2 mb-4" />
              {taskTurn ? (
                <Button
                  variant="accent"
                  size="full"
                  disabled={launching}
                  onClick={() => void startTask()}
                >
                  {launching ? <Loader2 size={14} className="animate-spin" /> : <Code size={14} />}
                  課題に取り組む
                </Button>
              ) : (
                <Button
                  variant="accent"
                  size="full"
                  disabled={!resumeId}
                  onClick={() => resumeId && onOpenLesson(resumeId)}
                >
                  <Play size={14} />
                  {stage.progress === 0 ? "受講を開始" : "続きから"}
                </Button>
              )}
              {wrapup && !lessonsLeft && !stage.completed ? (
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{wrapup.detail}</p>
              ) : null}
              {/* 旧スタブを実装 (Issue #77): ステージ内の配布資料をまとめて一覧・DL する。 */}
              <Button size="full" className="mt-2" onClick={() => setMaterialsOpen(true)}>
                <Download size={13} />
                教材をダウンロード
              </Button>
            </CardContent>
          </Card>

          {criteriaRows.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>修了条件</CardTitle>
              </CardHeader>
              <CardContent className="text-[12.5px] flex flex-col gap-2.5">
                {criteriaRows.map((row) => {
                  // 満たした条件だけに緑のチェックを付ける。判定を読めていないあいだは
                  // どちらとも言わない (条件の一覧として出す)。受講登録の修了とは分けて、
                  // 数だけで決める — 管理者が手で修了にしたステージでも、未達の条件は未達と出す。
                  const known = row.done !== undefined && row.total !== undefined;
                  const met = known && (row.done ?? 0) >= (row.total ?? 0);
                  return (
                    <div key={row.key} className="flex items-center gap-2">
                      {met ? (
                        <CheckCircle size={14} className="text-success shrink-0" />
                      ) : (
                        <Circle
                          size={14}
                          className={cn("shrink-0", known ? "text-ink-3" : "text-ink-4")}
                        />
                      )}
                      <span className={cn(known && !met ? "text-foreground" : undefined)}>
                        {row.label}
                      </span>
                      {known ? (
                        <span className="ml-auto tabular-nums text-[11.5px] text-ink-3">
                          {row.total === 0 ? "対象なし" : `${row.done} / ${row.total}`}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <StageMaterialsDialog
        open={materialsOpen}
        onOpenChange={setMaterialsOpen}
        stageId={stage.id}
        stageTitle={stage.title}
      />
    </>
  );
};

const LessonRow = ({
  lesson,
  status,
  onClick,
  reviewedSubmissionId,
  onOpenSubmission,
}: {
  lesson: Lesson;
  /** 進捗ストアで解決済みの表示ステータス。 */
  status: LessonStatus;
  onClick: () => void;
  reviewedSubmissionId?: string;
  onOpenSubmission?: (submissionId: string) => void;
}) => {
  const locked = status === "locked";
  return (
    <button
      type="button"
      disabled={locked}
      onClick={locked ? undefined : onClick}
      className={cn(
        "flex w-full items-start gap-2.5 px-4 py-2.5 text-left text-[12.5px] border-l-2 border-transparent bg-transparent",
        locked
          ? "text-ink-4 cursor-not-allowed"
          : "text-ink-2 cursor-pointer hover:bg-sunken hover:text-foreground",
      )}
    >
      <span className={cn("shrink-0 mt-0.5", status === "done" ? "text-success" : "text-ink-3")}>
        <LessonStatusIcon status={status} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="truncate">{lesson.title}</div>
        <div className="flex items-center gap-1 text-ink-3 text-[11px] mt-0.5">
          <LessonTypeIcon type={lesson.type} size={10} />
          <span>{lesson.duration}</span>
          {status === "active" && lesson.progress !== undefined ? (
            <>
              <span>·</span>
              <span>進捗 {lesson.progress}%</span>
            </>
          ) : null}
        </div>
      </div>
      {reviewedSubmissionId && onOpenSubmission ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenSubmission(reviewedSubmissionId);
          }}
        >
          <Badge variant="success">添削済み</Badge>
        </button>
      ) : null}
      {!locked ? <ChevronRight size={13} className="text-ink-4 mt-1" /> : null}
    </button>
  );
};
