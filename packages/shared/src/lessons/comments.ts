export const COMMENT_BODY_MAX = 2000;
export const COMMENT_MENTIONS_MAX = 10;
export const COMMENT_PAGE_SIZE = 20;

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
  | { state: "current" | "outdated"; positionSec: number }
  | { state: "untimed" | "orphaned"; positionSec: null };

export function sceneAt(
  scenes: readonly VideoScene[] | null,
  positionSec: number,
): VideoScene | null {
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
  if (comment.positionSec === null) return { state: "untimed", positionSec: null };
  if (current.videoPath === null) return { state: "orphaned", positionSec: null };
  if (comment.videoPath === current.videoPath) {
    return { state: "current", positionSec: comment.positionSec };
  }

  const scene = current.scenes?.find(({ id }) => id === comment.sceneId);
  if (!scene || comment.sceneHash === null || comment.sceneOffsetSec === null) {
    return { state: "orphaned", positionSec: null };
  }
  if (scene.hash !== comment.sceneHash) {
    return { state: "outdated", positionSec: scene.startSec };
  }
  return {
    state: "current",
    positionSec: scene.startSec + Math.min(comment.sceneOffsetSec, scene.durationSec),
  };
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
  replies: CommentReply[];
}

export interface CommentMarker {
  id: string;
  position_sec: number;
  resolved: boolean;
}

export interface LessonCommentsResponse {
  video: { scenes: { id: string; start_sec: number; duration_sec: number }[] };
  total: number;
  orphaned_count: number;
  markers: CommentMarker[];
  threads: CommentThread[];
}

export interface CommentResolveResponse {
  resolved: boolean;
}
