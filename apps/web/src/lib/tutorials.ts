import { useEffect, useState } from "react";

export interface TutorialChapter {
  t: number;
  title: string;
}
export interface Tutorial {
  id: string;
  title: string;
  summary: string;
  /** HELP_TOPICS の route と同じルートパターン。 */
  screen: string;
  order: number;
  duration: number;
  video: string;
  poster: string;
  captions: string;
  chapters: TutorialChapter[];
  narration: boolean;
  draft?: boolean;
  theme?: string;
  recordedAt: string;
  sourceHash: string;
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
function asset(v: unknown): string | null {
  if (typeof v !== "string") return null;
  // 同じオリジンの tutorials 内だけ。パスの迂回・エンコード・外部URLを許可しない。
  const path = v.startsWith("/tutorials/") ? v.slice("/tutorials/".length) : v;
  const parts = path.split("/");
  if (!v.startsWith("/tutorials/") && parts.length !== 1) return null;
  if (!parts.every((part) => /^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(part))) return null;
  return `/tutorials/${path}`;
}
export function parseTutorialManifest(value: unknown): Tutorial[] {
  if (!record(value) || !Array.isArray(value.tutorials)) return [];
  const result: Tutorial[] = [];
  for (const row of value.tutorials) {
    if (!record(row) || row.draft === true) continue;
    const {
      id,
      title,
      summary,
      screen,
      order,
      duration,
      chapters,
      narration,
      recordedAt,
      sourceHash,
    } = row;
    const video = asset(row.video),
      poster = asset(row.poster),
      captions = asset(row.captions);
    if (
      typeof id !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) ||
      typeof title !== "string" ||
      !title.trim() ||
      typeof summary !== "string" ||
      typeof screen !== "string" ||
      !screen.startsWith("/") ||
      !finite(order) ||
      !finite(duration) ||
      duration < 0 ||
      !video ||
      !poster ||
      !captions ||
      typeof narration !== "boolean" ||
      typeof recordedAt !== "string" ||
      typeof sourceHash !== "string" ||
      (row.draft !== undefined && typeof row.draft !== "boolean") ||
      (row.theme !== undefined && typeof row.theme !== "string") ||
      !Array.isArray(chapters) ||
      !chapters.every(
        (c) =>
          record(c) &&
          finite(c.t) &&
          c.t >= 0 &&
          c.t <= duration &&
          typeof c.title === "string" &&
          c.title.trim(),
      )
    )
      continue;
    result.push({
      id,
      title,
      summary,
      screen,
      order,
      duration,
      video,
      poster,
      captions,
      chapters: chapters as TutorialChapter[],
      narration,
      recordedAt,
      sourceHash,
      draft: row.draft as boolean | undefined,
      theme: row.theme as string | undefined,
    });
  }
  return result.sort((a, b) => a.order - b.order);
}
let cache: Tutorial[] | null = null;
let loading: Promise<Tutorial[]> | null = null;
export function loadTutorials(): Promise<Tutorial[]> {
  if (cache) return Promise.resolve(cache);
  loading ??= fetch("/tutorials/manifest.json", { cache: "no-cache" })
    .then(async (response) => (response.ok ? parseTutorialManifest(await response.json()) : []))
    .catch(() => [] as Tutorial[])
    .then((list) => {
      cache = list;
      return list;
    });
  return loading;
}
export function useTutorials(): Tutorial[] {
  const [list, setList] = useState(cache ?? []);
  useEffect(() => {
    let active = true;
    void loadTutorials().then((value) => {
      if (active) setList(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return list;
}
export function tutorialsForRoute(
  route: string,
  list: readonly Tutorial[] = cache ?? [],
): Tutorial[] {
  return list.filter((t) => !t.draft && t.screen === route).sort((a, b) => a.order - b.order);
}
export function tutorialById(
  id: string,
  list: readonly Tutorial[] = cache ?? [],
): Tutorial | undefined {
  return list.find((t) => !t.draft && t.id === id);
}
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
