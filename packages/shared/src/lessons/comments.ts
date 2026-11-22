export const COMMENT_BODY_MAX = 2000;
export const COMMENT_MENTIONS_MAX = 10;
export const COMMENT_PAGE_SIZE = 20;
export const COMMENT_NOTIFICATION_TYPES = [
  "lesson_comment",
  "lesson_comment_reply",
  "lesson_comment_mention",
] as const;

export interface VideoScene {
  id: string;
  startSec: number;
  durationSec: number;
  hash: string;
}

export interface CommentAnchor {
  positionSec: number | null;
  videoPath: string | null;
  sceneId: string | null;
  sceneOffsetSec: number | null;
  sceneHash: string | null;
}

export type CommentPosition =
  | { state: "current" | "outdated"; positionSec: number; sceneId: string | null }
  | { state: "untimed" | "orphaned"; positionSec: null; sceneId: null };

export function sceneAt<Scene extends Pick<VideoScene, "startSec" | "durationSec">>(
  scenes: readonly Scene[] | null,
  positionSec: number,
): Scene | null {
  return (
    scenes?.find((scene, index) => {
      const end = scene.startSec + scene.durationSec;
      return (
        positionSec >= scene.startSec &&
        (positionSec < end || (index === scenes.length - 1 && positionSec === end))
      );
    }) ?? null
  );
}

export function resolveCommentPosition(
  comment: CommentAnchor,
  current: { videoPath: string | null; scenes: readonly VideoScene[] | null },
): CommentPosition {
  if (comment.positionSec === null) return { state: "untimed", positionSec: null, sceneId: null };
  if (current.videoPath === null) return { state: "orphaned", positionSec: null, sceneId: null };
  if (comment.videoPath === current.videoPath) {
    return {
      state: "current",
      positionSec: comment.positionSec,
      sceneId: sceneAt(current.scenes, comment.positionSec)?.id ?? null,
    };
  }

  const sameId = current.scenes?.find(({ id }) => id === comment.sceneId);
  if (comment.sceneHash === null || comment.sceneOffsetSec === null) {
    return { state: "orphaned", positionSec: null, sceneId: null };
  }
  let scene = sameId;
  if (sameId?.hash !== comment.sceneHash) {
    const matches = current.scenes?.filter(({ hash }) => hash === comment.sceneHash);
    scene = matches?.length === 1 ? matches[0] : undefined;
  }
  if (scene) {
    const maxOffset =
      scene === current.scenes?.at(-1) ? scene.durationSec : Math.max(0, scene.durationSec - 0.001);
    return {
      state: "current",
      positionSec: scene.startSec + Math.min(comment.sceneOffsetSec, maxOffset),
      sceneId: scene.id,
    };
  }
  if (sameId) return { state: "outdated", positionSec: sameId.startSec, sceneId: sameId.id };
  return { state: "orphaned", positionSec: null, sceneId: null };
}

export function mentionCandidates(
  rootAuthorId: string,
  replyAuthorIds: readonly string[],
  callerId: string,
): string[] {
  const participants = new Set([rootAuthorId, ...replyAuthorIds]);
  participants.delete(callerId);
  return [...participants];
}

export interface CommentMention {
  id: string;
  name: string;
}

export interface CommentAuthor extends CommentMention {
  role: "admin" | "student";
  avatar_url?: string | null;
  is_self: boolean;
}

interface CommentEntry {
  id: string;
  author: CommentAuthor;
  body: string;
  created_at: number;
  can_delete: boolean;
}

export interface CommentReply extends CommentEntry {
  mentions: CommentMention[];
}

export interface CommentThread extends CommentEntry {
  position_sec: number | null;
  state: CommentPosition["state"];
  scene_id: string | null;
  resolved: boolean;
  can_resolve: boolean;
  reply_count?: number;
  replies: CommentReply[];
  mention_candidates: CommentMention[];
}

export interface CommentMarker {
  id: string;
  position_sec: number;
  resolved: boolean;
  author_name: string;
  excerpt: string;
}

export type CommentFilter = "all" | "mine" | "scene";

export interface LessonCommentsResponse {
  video: { scenes: { id: string; start_sec: number; duration_sec: number }[] };
  total: number;
  orphaned_count: number;
  include_state?: CommentPosition["state"] | null;
  markers: CommentMarker[];
  threads: CommentThread[];
}

export interface CommentResolveResponse {
  resolved: boolean;
}
