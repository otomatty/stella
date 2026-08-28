export const PENDING_LESSON_KEY = "pendingLesson";

export interface PendingLesson {
  stageId: string;
  lessonId: string;
}

export function isExtensionUriPath(path: string, name: "link" | "lesson"): boolean {
  return path === `/${name}` || path === name;
}

/** `/link` と `/lesson` の両方が `code` を運ぶ。 lesson 側は接続とレッスン表示を 1 URI で兼ねる。 */
export function parseLinkCode(query: string): string | undefined {
  return new URLSearchParams(query).get("code") || undefined;
}

export function parsePendingLesson(query: string): PendingLesson | undefined {
  const params = new URLSearchParams(query);
  // TODO(stage-rename-compat): 旧拡張(<=0.1.0)互換。 拡張更新の浸透後に削除
  // 旧 Web がミントした `courseId=` だけの URI も開けるようにする。
  const stageId = params.get("stageId") ?? params.get("courseId");
  const lessonId = params.get("lessonId");
  if (!stageId || !lessonId) {
    return undefined;
  }
  return { stageId, lessonId };
}

export function readPendingLesson(value: unknown): PendingLesson | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  // TODO(stage-rename-compat): 旧拡張(<=0.1.0)互換。 拡張更新の浸透後に削除
  // workspaceState に旧形 `{courseId, lessonId}` で残った保留ディープリンクを 1 回だけ救う。
  const legacy = (value as { courseId?: unknown }).courseId;
  const stageId = (value as { stageId?: unknown }).stageId ?? legacy;
  const lessonId = (value as { lessonId?: unknown }).lessonId;
  if (typeof stageId !== "string" || typeof lessonId !== "string" || !stageId || !lessonId) {
    return undefined;
  }
  return { stageId, lessonId };
}

/** Resume only after this `/link` exchange stored a token — not because one already exists. */
export function shouldResumeAfterLink(linkSucceeded: boolean): boolean {
  return linkSucceeded === true;
}

/** URI-driven opens always refetch. A warm cache must not skip the token check. */
export async function loadLessonForUri<T>(
  stageId: string,
  lessonId: string,
  loadCatalog: () => Promise<unknown>,
  findLesson: (stageId: string, lessonId: string) => T | undefined,
): Promise<T | undefined> {
  await loadCatalog();
  return findLesson(stageId, lessonId);
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
