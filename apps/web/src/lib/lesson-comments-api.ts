import type {
  CommentFilter,
  CommentReply,
  CommentResolveResponse,
  CommentThread,
  LessonCommentsResponse,
} from "@stella/shared/lessons/comments";
import { apiFetch } from "./api-client";

const PATH = "/api/lesson-comments";

interface ListLessonCommentsInput {
  lessonId: string;
  scope?: "active" | "orphaned";
  sort?: "time" | "new";
  filter?: CommentFilter;
  sceneId?: string;
  include?: string;
  offset?: number;
  limit?: number;
}

export function listLessonComments(
  input: ListLessonCommentsInput,
  signal?: AbortSignal,
): Promise<LessonCommentsResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) query.set(key, String(value));
  }
  return apiFetch(`${PATH}?${query}`, { signal });
}

interface PostLessonCommentInput {
  lessonId: string;
  body: string;
  positionSec?: number | null;
  parentId?: string;
  mentionUserIds?: readonly string[];
}

export function postLessonComment(
  input: PostLessonCommentInput,
): Promise<CommentThread | CommentReply> {
  return apiFetch(PATH, { method: "POST", body: input });
}

export async function deleteLessonComment(id: string): Promise<void> {
  await apiFetch(`${PATH}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function resolveLessonComment(
  id: string,
  resolved: boolean,
): Promise<CommentResolveResponse> {
  return apiFetch(`${PATH}/${encodeURIComponent(id)}/resolve`, {
    method: "POST",
    body: { resolved },
  });
}
