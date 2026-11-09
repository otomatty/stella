import type { Submission } from "@stella/shared/review/types";
import type { Lesson, Stage } from "@/data/types";

export type LessonSubmissionTarget =
  | { kind: "task"; taskId: string }
  | { kind: "legacy"; lessonId: string; assignmentId?: string };

export function lessonSubmissionTarget({
  format,
  lesson,
  taskId,
}: {
  format: Stage["format"];
  lesson: Pick<Lesson, "id" | "type" | "assignmentId">;
  taskId: string | null;
}): LessonSubmissionTarget | null {
  if (lesson.type === "code" && lesson.assignmentId) {
    return { kind: "legacy", lessonId: lesson.id, assignmentId: lesson.assignmentId };
  }
  if (format === 2) {
    return lesson.type === "text" && taskId ? { kind: "task", taskId } : null;
  }
  if (lesson.type === "assignment") {
    return { kind: "legacy", lessonId: lesson.id, assignmentId: lesson.assignmentId };
  }
  return null;
}

export function submissionMatchesTarget(
  submission: Pick<Submission, "taskId" | "lessonId" | "assignmentId">,
  target: LessonSubmissionTarget,
): boolean {
  if (target.kind === "task") return submission.taskId === target.taskId;
  if (submission.taskId) return false;
  return (
    submission.lessonId === target.lessonId ||
    (Boolean(target.assignmentId) && submission.assignmentId === target.assignmentId)
  );
}
