import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import {
  CourseNotFoundNotice,
  EmptyCoursesNotice,
  LessonNotFoundNotice,
} from '@/components/shell/AppShell';
import { RoleGuard } from '@/components/shell/RoleGuard';
import { LessonPlayer } from '@/components/learner/LessonPlayer';

export const Route = createFileRoute('/_app/courses/$courseId/lessons/$lessonId')({
  component: LessonPage,
});

function LessonPage() {
  const s = useAppShell();
  const { courseId, lessonId } = Route.useParams();
  const target = s.courses.find((c) => c.id === courseId);
  // lessonId がコースに無いまま LessonPlayer へ渡すと先頭レッスンへ差し替えられて
  // URL まで書き換わるため、 ここで解決して不在なら明示的に表示する。
  const lessonExists =
    target?.sections?.some((sec) => sec.lessons.some((l) => l.id === lessonId)) ??
    false;
  return (
    <RoleGuard allow={['learner']} page="lesson">
      {target && !lessonExists ? (
        <LessonNotFoundNotice setPage={s.setPage} />
      ) : target ? (
        <LessonPlayer
          course={target}
          setPage={s.setPage}
          onOpenAIBot={s.onOpenAIBot}
          setAIContext={s.setAIContext}
          tenantId={s.tenantId}
          studentName={s.studentName}
          studentInitials={s.studentInitials}
          // seq=0 固定で安全: LessonPlayer は「id:seq」キーの変化で適用判定するため、
          // URL パラメータ (id) の変化だけで再適用される。
          initialLesson={{ id: lessonId, seq: 0 }}
          onActiveLessonChange={s.onActiveLessonChange}
        />
      ) : s.courses.length === 0 ? (
        <EmptyCoursesNotice setPage={s.setPage} />
      ) : (
        <CourseNotFoundNotice setPage={s.setPage} />
      )}
    </RoleGuard>
  );
}
