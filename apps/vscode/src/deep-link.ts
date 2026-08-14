export const PENDING_LESSON_KEY = "pendingLesson";

export interface PendingLesson {
  courseId: string;
  lessonId: string;
}

export function isExtensionUriPath(path: string, name: "link" | "lesson"): boolean {
  return path === `/${name}` || path === name;
}

export function parsePendingLesson(query: string): PendingLesson | undefined {
  const params = new URLSearchParams(query);
  const courseId = params.get("courseId");
  const lessonId = params.get("lessonId");
  if (!courseId || !lessonId) {
    return undefined;
  }
  return { courseId, lessonId };
}

export function readPendingLesson(value: unknown): PendingLesson | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const courseId = (value as { courseId?: unknown }).courseId;
  const lessonId = (value as { lessonId?: unknown }).lessonId;
  if (typeof courseId !== "string" || typeof lessonId !== "string" || !courseId || !lessonId) {
    return undefined;
  }
  return { courseId, lessonId };
}

/** Resume only after this `/link` exchange stored a token — not because one already exists. */
export function shouldResumeAfterLink(linkSucceeded: boolean): boolean {
  return linkSucceeded === true;
}

/** URI-driven opens always refetch. A warm cache must not skip the token check. */
export async function loadLessonForUri<T>(
  courseId: string,
  lessonId: string,
  loadCatalog: () => Promise<unknown>,
  findLesson: (courseId: string, lessonId: string) => T | undefined,
): Promise<T | undefined> {
  await loadCatalog();
  return findLesson(courseId, lessonId);
}

/** Missing lesson is a failed open — consumePendingOnSuccess must keep pendingLesson. */
export function requireDeepLinkedLesson<T>(lesson: T | undefined): T {
  if (!lesson) {
    throw new Error("レッスンが見つかりません");
  }
  return lesson;
}

/** Open first; return undefined so the caller can clear. Throws leave the stored pending intact. */
export async function consumePendingOnSuccess<T>(
  pending: T | undefined,
  open: (pending: T) => Promise<void>,
): Promise<T | undefined> {
  if (!pending) {
    return undefined;
  }
  await open(pending);
  return undefined;
}
