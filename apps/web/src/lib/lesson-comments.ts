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

export interface MentionRange {
  id: string;
  start: number;
  length: number;
}

export function moveMentionRanges(
  mentions: readonly MentionRange[],
  start: number,
  end: number,
  insertedLength: number,
): MentionRange[] {
  const shift = insertedLength - (end - start);
  return mentions.flatMap((mention) => {
    if (mention.start + mention.length <= start) return [mention];
    if (mention.start >= end) return [{ ...mention, start: mention.start + shift }];
    return [];
  });
}

export function trackMentionRanges(
  before: string,
  after: string,
  mentions: readonly MentionRange[],
  caret: number,
): MentionRange[] {
  if (before === after) return [...mentions];

  // 編集後のカーソルを手掛かりに、同じ表示名が続く場合も編集箇所を選ぶ。
  let suffix = 0;
  while (
    suffix < Math.min(before.length, after.length - caret) &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix++;
  }
  let start = 0;
  while (start < Math.min(caret, before.length - suffix) && before[start] === after[start]) {
    start++;
  }
  return moveMentionRanges(mentions, start, before.length - suffix, after.length - suffix - start);
}

export function mentionedIds(mentions: readonly MentionRange[]): string[] {
  return [...new Set(mentions.map(({ id }) => id))];
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
  return currentTime;
}

type SceneCoordinates = Pick<VideoScene, "id" | "startSec" | "durationSec">;
type ListedScene = LessonCommentsResponse["video"]["scenes"][number];

export function shouldOpenOrphanedComments(
  active: { threads: readonly Pick<CommentThread, "id">[]; orphaned_count: number } | undefined,
  threadId: string,
): boolean {
  return Boolean(
    active && active.orphaned_count > 0 && !active.threads.some(({ id }) => id === threadId),
  );
}

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
