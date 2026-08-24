import { createFileRoute } from "@tanstack/react-router";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { CourseList } from "@/components/learner/CourseList";
import { InstructorGeneric } from "@/components/instructor/InstructorGeneric";
import { AdminCoursesPage } from "@/components/admin/AdminCoursesPage";

export const Route = createFileRoute("/_app/courses/")({
  component: CoursesPage,
});

function CoursesPage() {
  return (
    <RoleGuard allow={["learner", "instructor", "admin"]}>
      <CoursesPageBody />
    </RoleGuard>
  );
}

function CoursesPageBody() {
  const s = useAppShell();
  if (s.role === "admin") {
    return (
      <AdminCoursesPage
        // seq を含めることで、 同じコースを選び直したときも再マウントされ
        // CourseEditor を閉じた後に開き直せる。
        key={s.highlightCourse ? `${s.highlightCourse.id}:${s.highlightCourse.seq}` : "list"}
        tenantId={s.tenantId}
        initialCourseId={s.highlightCourse?.id ?? null}
      />
    );
  }
  if (s.role === "instructor") {
    return (
      <InstructorGeneric
        page="courses"
        tenantId={s.tenantId}
        backendEnabled={s.backendEnabled}
        highlightCourseId={s.highlightCourse?.id ?? null}
        highlightSeq={s.highlightCourse?.seq ?? 0}
      />
    );
  }
  return (
    <CourseList setPage={s.setPage} courses={s.courses} setCurrentCourse={s.setCurrentCourse} />
  );
}
