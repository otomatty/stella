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
} from '@/lib/icons';
import { useState } from 'react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { CourseThumb } from '@/components/common/CourseThumb';
import { CourseMaterialsDialog } from '@/components/learner/CourseMaterialsDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardActions } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Course, Lesson, LessonStatus, LessonType } from '@/data/types';
import { useLessonProgressMap } from '@/hooks/useLessonProgress';
import { useMySubmissions } from '@/hooks/useMySubmissions';
import { resolveLessonStatus, resumeLessonId } from '@/lib/lesson-progress';
import { cn } from '@/lib/utils';

type LucideIcon = ComponentType<LucideProps>;

const lessonTypeIcon: Record<LessonType, LucideIcon> = {
  video: Video,
  slides: Presentation,
  text: FileText,
  quiz: HelpCircle,
  assignment: Upload,
  code: Terminal,
};

export const LessonTypeIcon = ({ type, size = 14 }: { type: LessonType; size?: number }) => {
  const Icon = lessonTypeIcon[type];
  return <Icon size={size} />;
};

export const LessonStatusIcon = ({ status }: { status: LessonStatus }) => {
  if (status === 'done') return <CheckCircle size={15} className="text-success" />;
  if (status === 'locked') return <Lock size={13} className="text-ink-4" />;
  if (status === 'active')
    return (
      <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand mt-1 ml-[3px] animate-lms-pulse" />
    );
  return <Circle size={14} />;
};

interface CourseDetailProps {
  course: Course;
  setPage: (page: string) => void;
  /** 指定のレッスンでレッスン画面を開く。 */
  onOpenLesson: (lessonId: string) => void;
  onOpenSubmission?: (submissionId: string) => void;
}

export const CourseDetail = ({
  course,
  setPage,
  onOpenLesson,
  onOpenSubmission,
}: CourseDetailProps) => {
  const sections = course.sections ?? [];
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const { submissions } = useMySubmissions(true);
  // 完了数は fixture の初期 status ではなく進捗ストア (サーバ同期済み) で解決する。
  const progressMap = useLessonProgressMap();
  const statusOf = (l: Lesson) => resolveLessonStatus(l, progressMap);
  const totalLessons =
    sections.reduce((a, s) => a + s.lessons.length, 0) || course.lessonsCount;
  const doneLessons = sections.reduce(
    (a, s) => a + s.lessons.filter((l) => statusOf(l) === 'done').length,
    0,
  );
  // 「続きから」 の再開位置 (最初の未完了レッスン)。 レッスンが無いコースでは null。
  const resumeId = resumeLessonId(course, progressMap);
  const reviewedForLesson = (lesson: Lesson) =>
    submissions.find((submission) => {
      if (submission.status === 'pending' || submission.courseTitle !== course.title) return false;
      if (submission.assignmentId) {
        return Boolean(lesson.assignmentId && submission.assignmentId === lesson.assignmentId);
      }
      return submission.assignmentTitle === lesson.title;
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setPage('courses')}
        className="flex items-center gap-1 mb-4 text-ink-3 text-[12.5px] hover:text-foreground"
      >
        <ChevronLeft size={14} />
        <span>コース一覧に戻る</span>
      </button>

      <div className="grid gap-6 items-start" style={{ gridTemplateColumns: '1fr 320px' }}>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="accent">{course.category}</Badge>
            <span className="text-[11.5px] text-ink-3">カテゴリ</span>
          </div>
          <h1 className="text-[26px] tracking-tight font-semibold mb-2.5">{course.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-ink-3 text-[13px] mb-6">
            {course.enrolledBy ? (
              <span className="flex items-center gap-1">
                <User size={13} /> {course.enrolledBy}
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <Video size={13} /> {totalLessons}レッスン
            </span>
            {course.duration != null ? (
              <span className="flex items-center gap-1">
                <Clock size={13} /> 約{course.duration}時間
              </span>
            ) : null}
            {course.dueAt ? (
              <span className="flex items-center gap-1">
                <Calendar size={13} /> 提出期限 {course.dueAt}
              </span>
            ) : null}
          </div>

          {course.description ? (
            <p className="text-sm leading-relaxed text-ink-2 mb-7 max-w-[720px]">
              {course.description}
            </p>
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
                      {s.lessons.filter((l) => statusOf(l) === 'done').length} /{' '}
                      {s.lessons.length} 完了
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
                        onClick={() => status !== 'locked' && onOpenLesson(l.id)}
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
            <div className="relative border-b border-border" style={{ aspectRatio: '16 / 10' }}>
              <CourseThumb color={course.color} label={course.category} />
            </div>
            <CardContent>
              <div className="text-[11.5px] text-ink-3 mb-2">あなたの進捗</div>
              <div className="text-[32px] tracking-tight font-semibold">
                {course.progress}
                <span className="text-sm text-ink-3 font-normal">%</span>
              </div>
              <Progress value={course.progress} tone="brand" className="mt-2 mb-4" />
              <Button
                variant="accent"
                size="full"
                disabled={!resumeId}
                onClick={() => resumeId && onOpenLesson(resumeId)}
              >
                <Play size={14} />
                {course.progress === 0 ? '受講を開始' : '続きから'}
              </Button>
              {/* 旧スタブを実装 (Issue #77): コース内の配布資料をまとめて一覧・DL する。 */}
              <Button
                size="full"
                className="mt-2"
                onClick={() => setMaterialsOpen(true)}
              >
                <Download size={13} />
                教材をダウンロード
              </Button>
            </CardContent>
          </Card>

          {course.criteria ? (
            <Card>
              <CardHeader>
                <CardTitle>修了条件</CardTitle>
              </CardHeader>
              <CardContent className="text-[12.5px]">
                {course.criteria.requireAllLessons ? (
                  <div className="flex items-center gap-2 mb-2.5">
                    <CheckCircle size={14} className="text-success" />
                    <span>全レッスンの完了</span>
                  </div>
                ) : null}
                {course.criteria.requireQuizPass ? (
                  <div className="flex items-center gap-2 mb-2.5">
                    <CheckCircle size={14} className="text-success" />
                    <span>全小テストの合格</span>
                  </div>
                ) : null}
                {course.criteria.requireAssignmentPass ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-success" />
                    <span>全課題「合格」判定</span>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <CourseMaterialsDialog
        open={materialsOpen}
        onOpenChange={setMaterialsOpen}
        courseId={course.id}
        courseTitle={course.title}
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
  const locked = status === 'locked';
  return (
    <div
      onClick={locked ? undefined : onClick}
      className={cn(
        'flex items-start gap-2.5 px-4 py-2.5 text-[12.5px] border-l-2 border-transparent',
        locked
          ? 'text-ink-4 cursor-not-allowed'
          : 'text-ink-2 cursor-pointer hover:bg-sunken hover:text-foreground',
      )}
    >
      <span
        className={cn(
          'shrink-0 mt-0.5',
          status === 'done' ? 'text-success' : 'text-ink-3',
        )}
      >
        <LessonStatusIcon status={status} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="truncate">{lesson.title}</div>
        <div className="flex items-center gap-1 text-ink-3 text-[11px] mt-0.5">
          <LessonTypeIcon type={lesson.type} size={10} />
          <span>{lesson.duration}</span>
          {status === 'active' && lesson.progress !== undefined ? (
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
    </div>
  );
};
