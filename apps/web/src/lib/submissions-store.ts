/**
 * 提出物ストア (Issue #8 — 講師添削ワークフロー)。
 *
 * - バックエンド未設定: localStorage + fixtures シード (デモ / Tweaks)
 * - バックエンド設定済み: `submissions` テーブル。実データは PATCH await
 */

import type { Submission, ReviewVerdict } from "@stella/shared/review/types";
import { REVIEW_QUEUE, SUBMITTED_CODE, AI_SUGGESTIONS, RUBRIC } from "@/demo/fixtures";
import { isBackendConfigured } from "@/lib/backend";
import { ApiClientError } from "@/lib/api-client";
import {
  fetchSubmissionById,
  fetchSubmissions,
  insertSubmission,
  patchSubmission,
  type InsertSubmissionInput,
  type SubmissionPatch,
} from "@/lib/submissions-api";
import { needsHumanReview } from "@/lib/review-queue";
import { isFetchFresh, mergeFetchedRows } from "@/lib/submissions-refresh";

/**
 * 添削を保存しようとしたら、 学習者がその提出を引き継ぎ直していた (Issue #9)。
 * 講師が見ていないコードに添削を確定させないため、 呼び出し側で開き直させる。
 */
export class SubmissionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubmissionConflictError";
  }
}

const STORAGE_KEY = "lms_submissions_v1";

type StoreV1 = {
  version: 1;
  items: Submission[];
};

/** 以前の保存形。組織ごとに分けていたデモ提出を、読み込み時に 1 つの一覧へ畳む。 */
type LegacyStore = {
  version?: number;
  items?: Submission[];
  byTenant?: Record<string, Submission[]>;
};

let localCache: StoreV1 | null = null;
let localLoaded = false;
let storeVersion = 0;
const listeners = new Set<() => void>();
let listSnapshot: { version: number; snapshot: Submission[] } | null = null;

/** バックエンドモードのインメモリキャッシュ */
let remoteItems: Submission[] = [];
type RemoteFetchStatus = "idle" | "loading" | "success" | "error";
let remoteStatus: RemoteFetchStatus = "idle";
const remotePatchGen = new Map<string, number>();
/** 最後に一覧を読み終えた時刻 (取り直しの間引きに使う、#34)。 */
let remoteFetchedAtMs = 0;
/** 取り直し中 (重ねない)。 */
let remoteRefreshing = false;
/** 提出ごとの、講師が手元で最後に書いた時刻と保存中の提出 (取り直しで巻き戻さない)。 */
const localWriteAt = new Map<string, number>();
const patchesInFlight = new Set<string>();

function markLocalWrite(id: string): void {
  localWriteAt.set(id, Date.now());
}

function isRemotePersistence(): boolean {
  return isBackendConfigured();
}

function emit() {
  storeVersion += 1;
  listSnapshot = null;
  listeners.forEach((fn) => {
    fn();
  });
}

function setRemoteList(list: Submission[]): void {
  remoteItems = [...list].sort((a, b) => b.submittedAt - a.submittedAt);
  emit();
}

function ensureRemoteFetch(): void {
  if (!isRemotePersistence()) return;
  if (remoteStatus === "loading" || remoteStatus === "success") return;

  remoteStatus = "loading";
  void fetchSubmissions()
    .then((list) => {
      remoteStatus = "success";
      remoteFetchedAtMs = Date.now();
      setRemoteList(list);
    })
    .catch((err) => {
      remoteStatus = "error";
      console.error("[submissions-store] remote fetch failed", err);
    });
}

/**
 * staff の提出一覧を取り直す (#34)。ほかの講師の確定や AI の非同期の結果を画面に反映する。
 * 初回の読み込み中・取り直し中は重ねず、`force` でなければ直前に読んだばかりのときも取りに
 * 行かない。取り直しの間に講師が保存した・保存中の行は手元の行を残す。
 */
export async function refreshSubmissions(options: { force?: boolean } = {}): Promise<void> {
  if (!isRemotePersistence()) return;
  if (remoteStatus !== "success") {
    // 初回がまだなら、初回の読み込みに任せる (失敗していたら読み直す)。
    if (remoteStatus === "error") remoteStatus = "idle";
    ensureRemoteFetch();
    return;
  }
  if (remoteRefreshing) return;
  if (!options.force && isFetchFresh(remoteFetchedAtMs, Date.now())) return;
  remoteRefreshing = true;
  const startedAt = Date.now();
  try {
    const list = await fetchSubmissions();
    remoteFetchedAtMs = Date.now();
    setRemoteList(
      mergeFetchedRows(
        remoteItems,
        list,
        (id) => patchesInFlight.has(id) || (localWriteAt.get(id) ?? 0) >= startedAt,
      ),
    );
  } catch (err) {
    console.error("[submissions-store] remote refresh failed", err);
  } finally {
    remoteRefreshing = false;
  }
}

function toInsertPayload(
  base: InsertSubmissionInput & {
    studentName: string;
    studentInitials: string;
    avatarTone: Submission["avatarTone"];
  },
): InsertSubmissionInput {
  return {
    stageTitle: base.stageTitle,
    sectionTitle: base.sectionTitle,
    assignmentTitle: base.assignmentTitle,
    lessonId: base.lessonId,
    assignmentId: base.assignmentId,
    codeLines: base.codeLines,
    priority: base.priority,
    attempt: base.attempt,
  };
}

function toSubmissionPatch(patch: Partial<Submission>): SubmissionPatch {
  const out: SubmissionPatch = {};
  if (patch.status !== undefined) out.status = patch.status;
  if (patch.priority !== undefined) out.priority = patch.priority;
  if (patch.attempt !== undefined) out.attempt = patch.attempt;
  if (patch.aiReady !== undefined) out.aiReady = patch.aiReady;
  if (patch.aiSuggestions !== undefined) out.aiSuggestions = patch.aiSuggestions;
  if (patch.rubric !== undefined) out.rubric = patch.rubric;
  if (patch.reviewNotes !== undefined) out.reviewNotes = patch.reviewNotes;
  if (patch.verdict !== undefined) out.verdict = patch.verdict;
  if (patch.codeLines !== undefined) out.codeLines = patch.codeLines;
  return out;
}

/** 保存が無いときは null (まだシードしていない)。空配列は「提出が無い」で、シードし直さない。 */
function loadLocalStore(): StoreV1 | null {
  if (localLoaded) return localCache;
  localLoaded = true;
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LegacyStore;
      if (parsed?.version === 1 && Array.isArray(parsed.items)) {
        localCache = { version: 1, items: parsed.items };
        return localCache;
      }
      if (parsed?.version === 1 && parsed.byTenant) {
        localCache = { version: 1, items: Object.values(parsed.byTenant).flat() };
        return localCache;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveLocalStore(store: StoreV1): boolean {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (err) {
      console.error("[submissions-store] save failed", err);
      return false;
    }
  }
  localCache = store;
  localLoaded = true;
  emit();
  return true;
}

function relativeSubmittedAt(ms: number): string {
  const diff = Date.now() - ms;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "1時間以内";
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "昨日";
  return `${days}日前`;
}

function seedSubmissions(): Submission[] {
  const now = Date.now();
  return REVIEW_QUEUE.map((r, idx) => {
    const hoursAgo = (idx + 1) * 2;
    const submittedAt = now - hoursAgo * 3_600_000;
    const isFirst = r.id === "r1";
    return {
      id: r.id,
      studentName: r.student,
      studentInitials: r.initials,
      avatarTone: r.c,
      stageTitle: r.stage,
      assignmentTitle: r.assignment,
      codeLines: isFirst
        ? [...SUBMITTED_CODE]
        : [`// ${r.assignment} — ${r.student}`, "// (デモ提出コード)", ""],
      submittedAt,
      status: "pending" as const,
      priority: r.priority,
      attempt: r.assignment.includes("再提出") ? 2 : 1,
      aiReady: r.aiReady,
      aiSuggestions: isFirst && r.aiReady ? AI_SUGGESTIONS.map((s) => ({ ...s })) : [],
      rubric: isFirst && r.aiReady ? RUBRIC.map((x) => ({ ...x })) : [],
      reviewNotes: isFirst
        ? "コードは動作していますが、innerHTML による XSS リスクと等価演算子の使い方に改善の余地があります。"
        : "",
      verdict: null,
    };
  });
}

function localList(): Submission[] {
  const store = loadLocalStore();
  if (store) return store.items;
  const seeded = seedSubmissions();
  if (!saveLocalStore({ version: 1, items: seeded })) return seeded;
  return loadLocalStore()?.items ?? seeded;
}

function snapshotList(list: Submission[]): Submission[] {
  if (listSnapshot && listSnapshot.version === storeVersion) {
    return listSnapshot.snapshot;
  }
  const snapshot = [...list].sort((a, b) => b.submittedAt - a.submittedAt);
  listSnapshot = { version: storeVersion, snapshot };
  return snapshot;
}

export function listSubmissions(): Submission[] {
  if (isRemotePersistence()) {
    ensureRemoteFetch();
    return snapshotList(remoteItems);
  }
  return snapshotList(localList());
}

export function getSubmission(id: string): Submission | undefined {
  if (isRemotePersistence()) {
    ensureRemoteFetch();
    return remoteItems.find((s) => s.id === id);
  }
  return localList().find((s) => s.id === id);
}

/**
 * 保存・詳細の応答を、一覧から読んだ行に重ねる。応答に無い列 (一覧だけが返すキューの列 =
 * 人に回した理由・担当者など、#34) は前の値を残す。
 */
function mergeRow(before: Submission | undefined, row: Submission): Submission {
  if (!before) return row;
  const defined = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
  return { ...before, ...defined } as Submission;
}

function replaceRemote(id: string, row: Submission): void {
  const idx = remoteItems.findIndex((s) => s.id === id);
  if (idx < 0) return;
  markLocalWrite(id);
  const next = [...remoteItems];
  next[idx] = mergeRow(remoteItems[idx], row);
  setRemoteList(next);
}

/** 提出 1 件を取り直してキャッシュに重ねる (事後確認の操作のあとなど)。 */
export async function refreshSubmission(id: string): Promise<Submission | undefined> {
  if (!isRemotePersistence()) return getSubmission(id);
  try {
    const row = await fetchSubmissionById(id);
    replaceRemote(id, row);
    return remoteItems.find((s) => s.id === id);
  } catch (err) {
    console.error("[submissions-store] refresh failed", err);
    return undefined;
  }
}

/** 409 のときは講師のキャッシュを最新化してから知らせる (古いコードを表示し続けない)。 */
async function refreshAfterConflict(id: string): Promise<void> {
  try {
    replaceRemote(id, await fetchSubmissionById(id));
  } catch (err) {
    console.error("[submissions-store] conflict refresh failed", err);
  }
}

async function persistRemotePatch(
  id: string,
  patch: Partial<Submission>,
  rollback: Submission,
  options: { expectUndecided?: boolean } = {},
): Promise<Submission | undefined> {
  const nextGen = (remotePatchGen.get(id) ?? 0) + 1;
  remotePatchGen.set(id, nextGen);
  patchesInFlight.add(id);
  markLocalWrite(id);
  const apiPatch: SubmissionPatch = {
    ...toSubmissionPatch(patch),
    // 講師が読み込んだ版。 学習者が引き継ぎ直していればサーバが 409 を返す。
    expectedSubmittedAt: rollback.submittedAt,
    ...(options.expectUndecided ? { expectUndecided: true } : {}),
  };
  try {
    const saved = mergeRow(rollback, await patchSubmission(id, apiPatch));
    if (remotePatchGen.get(id) !== nextGen) return saved;
    const idx = remoteItems.findIndex((s) => s.id === id);
    if (idx >= 0) {
      const next = [...remoteItems];
      next[idx] = saved;
      setRemoteList(next);
    }
    return saved;
  } catch (err) {
    if (remotePatchGen.get(id) === nextGen) {
      console.error("[submissions-store] remote patch failed", err);
      replaceRemote(id, rollback);
    }
    if (err instanceof ApiClientError && err.status === 409) {
      await refreshAfterConflict(id);
      throw new SubmissionConflictError(err.message);
    }
    return undefined;
  } finally {
    if (remotePatchGen.get(id) === nextGen) patchesInFlight.delete(id);
    markLocalWrite(id);
  }
}

export async function updateSubmission(
  id: string,
  patch: Partial<Submission>,
  options: { expectUndecided?: boolean } = {},
): Promise<Submission | undefined> {
  if (isRemotePersistence()) {
    const idx = remoteItems.findIndex((s) => s.id === id);
    if (idx < 0) return undefined;
    const before = remoteItems[idx];
    if (!before) return undefined;
    const updated = { ...before, ...patch };
    setRemoteList(remoteItems.map((s, i) => (i === idx ? updated : s)));
    return persistRemotePatch(id, patch, before, options);
  }

  const list = localList();
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return undefined;
  const updated = { ...list[idx], ...patch };
  const newList = list.map((s, i) => (i === idx ? updated : s));
  if (!saveLocalStore({ version: 1, items: newList })) return undefined;
  return updated;
}

type NewSubmissionInput = Omit<
  Submission,
  | "id"
  | "submittedAt"
  | "status"
  | "aiReady"
  | "aiSuggestions"
  | "rubric"
  | "reviewNotes"
  | "verdict"
  | "attempt"
  | "priority"
> & { priority?: Submission["priority"]; attempt?: number };

export function createSubmission(input: NewSubmissionInput): Submission | null {
  const base = {
    ...input,
    priority: input.priority ?? "normal",
    attempt: input.attempt ?? 1,
  };

  // バックエンドモードは createSubmissionAsync を使う (同期 API は local のみ)
  if (isRemotePersistence()) {
    console.warn(
      "[submissions-store] createSubmission called in backend mode; use createSubmissionAsync",
    );
    return null;
  }

  const list = localList();
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}`;
  const submission: Submission = {
    id,
    submittedAt: Date.now(),
    status: "pending",
    aiReady: false,
    aiSuggestions: [],
    rubric: [],
    reviewNotes: "",
    verdict: null,
    ...base,
  };
  if (!saveLocalStore({ version: 1, items: [submission, ...list] })) return null;
  return submission;
}

export async function createSubmissionAsync(input: NewSubmissionInput): Promise<Submission | null> {
  const base = {
    ...input,
    priority: input.priority ?? "normal",
    attempt: input.attempt ?? 1,
  };

  if (!isRemotePersistence()) {
    return createSubmission(input);
  }

  try {
    const created = await insertSubmission(toInsertPayload(base));
    markLocalWrite(created.id);
    // 同一課題の未添削がある場合、 サーバは既存行を upsert して返す (Issue #9)。
    // 素直に先頭へ足すと同じ id が 2 つ並ぶので、 id で置き換える。
    setRemoteList([created, ...remoteItems.filter((s) => s.id !== created.id)]);
    return created;
  } catch (err) {
    console.error("[submissions-store] remote insert failed", err);
    return null;
  }
}

/**
 * 判定を確定する。`expectUndecided` は「まだ誰も確定していない」ときだけ確定する 1 回の操作
 * (#34)。別の講師が先に確定していれば `SubmissionConflictError` になる。
 */
export async function finalizeReview(
  id: string,
  verdict: ReviewVerdict,
  patch: {
    reviewNotes: string;
    aiSuggestions: Submission["aiSuggestions"];
    rubric: Submission["rubric"];
  },
  options: { expectUndecided?: boolean } = {},
): Promise<Submission | undefined> {
  const status = verdict === "pass" ? "passed" : verdict === "fail" ? "failed" : "resubmit";
  return updateSubmission(
    id,
    {
      ...patch,
      verdict,
      status,
    },
    options,
  );
}

export function formatSubmittedAt(ms: number): string {
  return relativeSubmittedAt(ms);
}

/** 人のレビューを待っている件数 (AI が確認中・置き換えた提出は数えない、#34)。 */
export function countPending(): number {
  if (isRemotePersistence()) {
    ensureRemoteFetch();
    return remoteItems.filter(needsHumanReview).length;
  }
  return localList().filter(needsHumanReview).length;
}

export function subscribeSubmissions(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      localCache = null;
      localLoaded = false;
      emit();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}
