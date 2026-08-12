import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { CourseNotFoundNotice, EmptyCoursesNotice } from '@/components/shell/AppShell';
import { RoleGuard } from '@/components/shell/RoleGuard';
import { CourseDetail } from '@/components/learner/CourseDetail';

export const Route = createFileRoute('/_app/courses/$courseId/')({
  component: CourseDetailPage,
});

function CourseDetailPage() {
  const s = useAppShell();
  const { courseId } = Route.useParams();
  const target = s.courses.find((c) => c.id === courseId);
  return (
    <RoleGuard allow={['learner']} page="course-detail">
      {target ? (
        <CourseDetail
          course={target}
          setPage={s.setPage}
          onOpenLesson={(lessonId) => s.onOpenLesson(target, lessonId)}
          onOpenSubmission={s.onOpenSubmission}
        />
      ) : s.courses.length === 0 ? (
        // コース取得前 (リロード直後) と受講コースゼロはこの表示 (旧挙動どおり)
        <EmptyCoursesNotice setPage={s.setPage} />
      ) : (
        <CourseNotFoundNotice setPage={s.setPage} />
      )}
    </RoleGuard>
  );
}
