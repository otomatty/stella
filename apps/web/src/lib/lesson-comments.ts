import {
  type CommentMention,
  type CommentThread,
  type LessonCommentsResponse,
  type VideoScene,
  sceneAt,
} from "@stella/shared/lessons/comments";

export function parseMentionQuery(text: string, caret: number) {
  const match = /(?:^|\s)@([^\s]*)$/u.exec(text.slice(0, caret));
  if (!match) return null;
  const query = match[1];
  return { start: caret - query.length - 1, query };
}

export function applyMention(text: string, range: { start: number; end: number }, name: string) {
  const mention = `@${name} `;
  return {
    text: text.slice(0, range.start) + mention + text.slice(range.end),
    caret: range.start + mention.length,
  };
}

type MentionPart = { text: string; mention?: CommentMention };

export function splitMentions(body: string, mentions: readonly CommentMention[]): MentionPart[] {
  const byName = new Map(
    mentions.filter(({ name }) => name).map((mention) => [mention.name, mention]),
  );
  if (!byName.size) return body ? [{ text: body }] : [];

  const names = [...byName.keys()]
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?<!\\S)@(${names.join("|")})(?![\\p{L}\\p{M}\\p{N}_])`, "gu");
  const parts: MentionPart[] = [];
  let offset = 0;
  for (const match of body.matchAll(pattern)) {
    if (match.index > offset) parts.push({ text: body.slice(offset, match.index) });
    parts.push({ text: match[0], mention: byName.get(match[1]) });
    offset = match.index + match[0].length;
  }
  if (offset < body.length) parts.push({ text: body.slice(offset) });
  return parts;
}

export function mentionedIds(body: string, picked: readonly CommentMention[]): string[] {
  const usedNames = new Set(splitMentions(body, picked).map(({ mention }) => mention?.name));
  return [...new Set(picked.filter(({ name }) => usedNames.has(name)).map(({ id }) => id))];
}

export function defaultCommentPosition({
  currentTime,
  duration,
  hasPlayed,
}: {
  currentTime: number;
  duration: number;
  hasPlayed: boolean;
}): number | null {
  if (!hasPlayed || currentTime >= duration - 1) return null;
  return Math.round(currentTime * 10) / 10;
}

type SceneCoordinates = Pick<VideoScene, "id" | "startSec" | "durationSec">;
type ListedScene = LessonCommentsResponse["video"]["scenes"][number];

export function isCurrentThread(
  thread: Pick<CommentThread, "position_sec" | "scene_id">,
  scenes: readonly (SceneCoordinates | ListedScene)[] | null,
  currentTime: number,
): boolean {
  if (thread.position_sec === null) return false;
  const coordinates = scenes?.map((scene) =>
    "start_sec" in scene
      ? { id: scene.id, startSec: scene.start_sec, durationSec: scene.duration_sec }
      : scene,
  );
  const scene = sceneAt(coordinates ?? null, currentTime);
  return scene ? scene.id === thread.scene_id : Math.abs(thread.position_sec - currentTime) <= 5;
}
