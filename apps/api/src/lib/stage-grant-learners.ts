/**
 * Extra ステージの割り当て一覧を、Worker の中で絞り込む。
 *
 * 受講者 id を SQL の `inArray` に並べない (D1 は 1 文 100 バインド)。
 * 呼び出し側はステージ・前提の数個・担当の全件を渡し、検索・状態・並べ替え・
 * ページ分けはここだけで決める。
 */

export const STAGE_GRANT_LEARNER_PAGE_SIZE = 50;
export const STAGE_GRANT_LEARNER_PAGE_MAX = 100;

export type StageGrantLearnerStatus = "all" | "assigned" | "unassigned" | "exempted";
export type StageGrantPrerequisiteFilter = "all" | "done" | "doing" | "none";
export type StageGrantPrerequisiteStatus = "done" | "doing" | "none";

export type StageGrantInstructorFilter =
  | { type: "all" }
  | { type: "mine" }
  | { type: "none" }
  | { type: "id"; id: string };

const STATUSES = ["all", "assigned", "unassigned", "exempted"] as const;
const PREREQS = ["all", "done", "doing", "none"] as const;

export interface StageGrantLearnerQuery {
  q: string;
  status: StageGrantLearnerStatus;
  instructor: StageGrantInstructorFilter;
  prereq: StageGrantPrerequisiteFilter;
  offset: number;
  limit: number;
}

export type StageGrantParse<T> = { ok: true; value: T } | { ok: false; error: string };

/** 検索語。NFKC で全角半角を揃え、前後の空白を外し、大文字小文字を区別しない。 */
export function normalizeStageGrantSearch(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

function clampPageNumber(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  if (!/^\d+$/.test(raw.trim())) return fallback;
  const value = Number(raw.trim());
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function oneOf<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  label: string,
): T | { error: string } {
  const fallback = allowed[0];
  if (fallback === undefined) return { error: `${label} が不正です` };
  if (raw === undefined || raw === "") return fallback;
  if ((allowed as readonly string[]).includes(raw)) return raw as T;
  return { error: `${label} は ${allowed.join("、")} のいずれかです` };
}

export function parseStageGrantLearnerQuery(raw: {
  q?: string;
  status?: string;
  instructor?: string;
  prereq?: string;
  offset?: string;
  limit?: string;
}): StageGrantParse<StageGrantLearnerQuery> {
  const status = oneOf(raw.status, STATUSES, "status");
  if (typeof status !== "string") return { ok: false, error: status.error };
  const prereq = oneOf(raw.prereq, PREREQS, "prereq");
  if (typeof prereq !== "string") return { ok: false, error: prereq.error };
  const instructorText = raw.instructor?.trim() ?? "";
  const instructor: StageGrantInstructorFilter =
    instructorText === "" || instructorText === "all"
      ? { type: "all" }
      : instructorText === "mine"
        ? { type: "mine" }
        : instructorText === "none"
          ? { type: "none" }
          : { type: "id", id: instructorText };
  return {
    ok: true,
    value: {
      q: normalizeStageGrantSearch(raw.q ?? ""),
      status,
      instructor,
      prereq,
      offset: clampPageNumber(raw.offset, 0, 0, Number.MAX_SAFE_INTEGER),
      limit: clampPageNumber(
        raw.limit,
        STAGE_GRANT_LEARNER_PAGE_SIZE,
        1,
        STAGE_GRANT_LEARNER_PAGE_MAX,
      ),
    },
  };
}

export interface StageGrantLearnerProfile {
  id: string;
  display_name: string;
  email: string | null;
  role: string;
  disabled: boolean;
}

export interface StageGrantLearnerSource {
  profiles: readonly StageGrantLearnerProfile[];
  instructorLinks: readonly { learnerId: string; instructorId: string }[];
  assignedIds: ReadonlySet<string>;
  staffUnlockIds: ReadonlySet<string>;
  skillCheckUnlockIds: ReadonlySet<string>;
  /** ステージに書いた順。解けない slug も残す (クリア判定は未達)。 */
  prerequisiteSlugs: readonly string[];
  stagesBySlug: ReadonlyMap<string, { id: string; title: string }>;
  /** 受講者 → クリアした前提ステージ id。 */
  clearedByUser: ReadonlyMap<string, ReadonlySet<string>>;
  /** 受講者 → 受講登録がある前提ステージ id (完了以外も含む)。 */
  enrolledByUser: ReadonlyMap<string, ReadonlySet<string>>;
}

export interface StageGrantLearnerCounts {
  learners: number;
  assigned: number;
  unassigned: number;
  exempted: number;
}

export interface StageGrantListedLearner {
  id: string;
  display_name: string;
  email: string | null;
  selectable: boolean;
  instructor: { id: string; display_name: string } | null;
  assigned: boolean;
  exempted: boolean;
  unlocked_by_skill_check: boolean;
  prerequisites_cleared: boolean;
  prerequisite_status: StageGrantPrerequisiteStatus;
}

export interface StageGrantLearnerList {
  prerequisites: { id: string; slug: string; title: string }[];
  counts: StageGrantLearnerCounts;
  instructors: { id: string; display_name: string }[];
  total: number;
  next_offset: number | null;
  learners: StageGrantListedLearner[];
}

/** 有効な受講者か、このステージに割り当てが残っている人。 */
export function isStageGrantLearner(
  profile: { role: string; disabled: boolean },
  assigned: boolean,
): boolean {
  return (profile.role === "student" && !profile.disabled) || assigned;
}

export function countStageGrantLearners(
  profiles: readonly { id: string; role: string; disabled: boolean }[],
  assigned: ReadonlySet<string>,
  exempted: ReadonlySet<string>,
): StageGrantLearnerCounts {
  let learners = 0;
  let assignedCount = 0;
  let exemptedCount = 0;
  for (const profile of profiles) {
    if (!isStageGrantLearner(profile, assigned.has(profile.id))) continue;
    learners += 1;
    if (assigned.has(profile.id)) assignedCount += 1;
    if (exempted.has(profile.id)) exemptedCount += 1;
  }
  return {
    learners,
    assigned: assignedCount,
    unassigned: learners - assignedCount,
    exempted: exemptedCount,
  };
}

function prerequisiteView(
  slugs: readonly string[],
  stagesBySlug: ReadonlyMap<string, { id: string; title: string }>,
  cleared: ReadonlySet<string> | undefined,
  enrolled: ReadonlySet<string> | undefined,
): { cleared: boolean; status: StageGrantPrerequisiteStatus } {
  if (slugs.length === 0) return { cleared: true, status: "done" };
  const ids = slugs.map((slug) => stagesBySlug.get(slug)?.id);
  const allCleared = ids.every((id) => id !== undefined && (cleared?.has(id) ?? false));
  if (allCleared) return { cleared: true, status: "done" };
  const started = ids.some(
    (id) => id !== undefined && ((enrolled?.has(id) ?? false) || (cleared?.has(id) ?? false)),
  );
  return { cleared: false, status: started ? "doing" : "none" };
}

function resolvedPrerequisites(
  slugs: readonly string[],
  stagesBySlug: ReadonlyMap<string, { id: string; title: string }>,
): { id: string; slug: string; title: string }[] {
  const listed: { id: string; slug: string; title: string }[] = [];
  const seen = new Set<string>();
  for (const slug of slugs) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    const stage = stagesBySlug.get(slug);
    if (!stage) continue;
    listed.push({ id: stage.id, slug, title: stage.title });
  }
  return listed;
}

function compareJaThenId(
  a: { display_name: string; id: string },
  b: { display_name: string; id: string },
): number {
  const byName = a.display_name.localeCompare(b.display_name, "ja");
  if (byName !== 0) return byName;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

function matchesSearch(displayName: string, email: string | null, rawNeedle: string): boolean {
  const needle = normalizeStageGrantSearch(rawNeedle);
  if (needle === "") return true;
  if (displayName.normalize("NFKC").toLowerCase().includes(needle)) return true;
  return email?.normalize("NFKC").toLowerCase().includes(needle) ?? false;
}

function matchesInstructor(
  instructorId: string | null,
  filter: StageGrantInstructorFilter,
  callerId: string,
): boolean {
  if (filter.type === "all") return true;
  if (filter.type === "mine") return instructorId === callerId;
  if (filter.type === "none") return instructorId === null;
  return instructorId === filter.id;
}

export function listStageGrantLearners(
  source: StageGrantLearnerSource,
  query: StageGrantLearnerQuery,
  callerId: string,
): StageGrantLearnerList {
  const nameById = new Map(source.profiles.map((profile) => [profile.id, profile.display_name]));
  const instructorByLearner = new Map<string, string>();
  for (const link of source.instructorLinks) {
    if (!instructorByLearner.has(link.learnerId)) {
      instructorByLearner.set(link.learnerId, link.instructorId);
    }
  }

  const rows: StageGrantListedLearner[] = [];
  for (const profile of source.profiles) {
    const assigned = source.assignedIds.has(profile.id);
    if (!isStageGrantLearner(profile, assigned)) continue;
    const instructorId = instructorByLearner.get(profile.id) ?? null;
    const instructorName = instructorId === null ? undefined : nameById.get(instructorId);
    const progress = prerequisiteView(
      source.prerequisiteSlugs,
      source.stagesBySlug,
      source.clearedByUser.get(profile.id),
      source.enrolledByUser.get(profile.id),
    );
    rows.push({
      id: profile.id,
      display_name: profile.display_name,
      email: profile.email,
      selectable: profile.role === "student" && !profile.disabled,
      instructor:
        instructorId !== null && instructorName !== undefined
          ? { id: instructorId, display_name: instructorName }
          : null,
      assigned,
      exempted: source.staffUnlockIds.has(profile.id),
      unlocked_by_skill_check: source.skillCheckUnlockIds.has(profile.id),
      prerequisites_cleared: progress.cleared,
      prerequisite_status: progress.status,
    });
  }

  const counts: StageGrantLearnerCounts = {
    learners: rows.length,
    assigned: 0,
    unassigned: 0,
    exempted: 0,
  };
  for (const row of rows) {
    if (row.assigned) counts.assigned += 1;
    else counts.unassigned += 1;
    if (row.exempted) counts.exempted += 1;
  }

  const matched = rows.filter((row) => {
    if (!matchesSearch(row.display_name, row.email, query.q)) return false;
    if (query.status === "assigned" && !row.assigned) return false;
    if (query.status === "unassigned" && row.assigned) return false;
    if (query.status === "exempted" && !row.exempted) return false;
    if (query.prereq !== "all" && row.prerequisite_status !== query.prereq) return false;
    const instructorId = row.instructor?.id ?? instructorByLearner.get(row.id) ?? null;
    return matchesInstructor(instructorId, query.instructor, callerId);
  });
  matched.sort(compareJaThenId);

  const instructors = [...new Set(source.instructorLinks.map((link) => link.instructorId))]
    .flatMap((id) => {
      const display_name = nameById.get(id);
      if (display_name === undefined) return [];
      return [{ id, display_name }];
    })
    .sort(compareJaThenId);

  const learners = matched.slice(query.offset, query.offset + query.limit);
  return {
    prerequisites: resolvedPrerequisites(source.prerequisiteSlugs, source.stagesBySlug),
    counts,
    instructors,
    total: matched.length,
    next_offset: query.offset + query.limit < matched.length ? query.offset + query.limit : null,
    learners,
  };
}
