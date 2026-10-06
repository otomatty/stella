/**
 * 提出物ストア (Issue #8 — 講師添削ワークフロー)。
 *
 * - バックエンド未設定: localStorage + fixtures シード (デモ / Tweaks)
 * - バックエンド設定済み: `submissions` テーブル (RLS)。実データは PATCH await
 */

import type { Submission, ReviewVerdict } from "@stella/shared/review/types";
import { REVIEW_QUEUE, SUBMITTED_CODE, AI_SUGGESTIONS, RUBRIC } from "@/demo/fixtures";
import type { Tenant } from "@/data/types";
import { isBackendConfigured } from "@/lib/backend";
import { ApiClientError } from "@/lib/api-client";
import {
  fetchSubmissionById,
  fetchSubmissionsForTenant,
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
  byTenant: Record<string, Submission[]>;
};

let localCache: StoreV1 | null = null;
let storeVersion = 0;
const listeners = new Set<() => void>();
const listSnapshotCache = new Map<string, { version: number; snapshot: Submission[] }>();

/** バックエンドモード: テナント別インメモリキャッシュ */
const remoteByTenant = new Map<string, Submission[]>();
type RemoteFetchStatus = "idle" | "loading" | "success" | "error";
const remoteFetchStatus = new Map<string, RemoteFetchStatus>();
const remotePatchGen = new Map<string, number>();
/** テナントごとの、最後に一覧を読み終えた時刻 (取り直しの間引きに使う、#34)。 */
const remoteFetchedAt = new Map<string, number>();
/** 取り直し中のテナント (同じテナントの取り直しを重ねない)。 */
const remoteRefreshing = new Set<string>();
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
  listSnapshotCache.clear();
  listeners.forEach((fn) => {
    fn();
  });
}

function remoteList(tenantId: Tenant["id"]): Submission[] {
  return remoteByTenant.get(tenantId) ?? [];
}

function setRemoteList(tenantId: Tenant["id"], list: Submission[]): void {
  remoteByTenant.set(
    tenantId,
    [...list].sort((a, b) => b.submittedAt - a.submittedAt),
  );
  emit();
}

function ensureRemoteFetch(tenantId: Tenant["id"]): void {
  if (!isRemotePersistence()) return;
  const status = remoteFetchStatus.get(tenantId) ?? "idle";
  if (status === "loading" || status === "success") return;

  remoteFetchStatus.set(tenantId, "loading");
  void fetchSubmissionsForTenant(tenantId)
    .then((list) => {
      remoteFetchStatus.set(tenantId, "success");
      remoteFetchedAt.set(tenantId, Date.now());
      setRemoteList(tenantId, list);
    })
    .catch((err) => {
      remoteFetchStatus.set(tenantId, "error");
      console.error("[submissions-store] remote fetch failed", err);
    });
}

/**
 * staff の提出一覧を取り直す (#34)。ほかの講師の確定や AI の非同期の結果を画面に反映する。
 * 初回の読み込み中・取り直し中は重ねず、`force` でなければ直前に読んだばかりのときも取りに
 * 行かない。取り直しの間に講師が保存した・保存中の行は手元の行を残す。
 */
export async function refreshSubmissions(
  tenantId: Tenant["id"],
  options: { force?: boolean } = {},
): Promise<void> {
  if (!isRemotePersistence()) return;
  if (remoteFetchStatus.get(tenantId) !== "success") {
    // 初回がまだなら、初回の読み込みに任せる (失敗していたら読み直す)。
    if (remoteFetchStatus.get(tenantId) === "error") remoteFetchStatus.set(tenantId, "idle");
    ensureRemoteFetch(tenantId);
    return;
  }
  if (remoteRefreshing.has(tenantId)) return;
  if (!options.force && isFetchFresh(remoteFetchedAt.get(tenantId), Date.now())) return;
  remoteRefreshing.add(tenantId);
  const startedAt = Date.now();
  try {
    const list = await fetchSubmissionsForTenant(tenantId);
    remoteFetchedAt.set(tenantId, Date.now());
    setRemoteList(
      tenantId,
      mergeFetchedRows(
        remoteList(tenantId),
        list,
        (id) => patchesInFlight.has(id) || (localWriteAt.get(id) ?? 0) >= startedAt,
      ),
    );
  } catch (err) {
    console.error("[submissions-store] remote refresh failed", err);
  } finally {
    remoteRefreshing.delete(tenantId);
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

function loadLocalStore(): StoreV1 {
  if (localCache) return localCache;
  if (typeof window === "undefined") {
    localCache = { version: 1, byTenant: {} };
    return localCache;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreV1;
      if (parsed?.version === 1 && parsed.byTenant) {
        localCache = parsed;
        return localCache;
      }
    }
  } catch {
    /* ignore */
  }
  localCache = { version: 1, byTenant: {} };
  return localCache;
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
  emit();
  return true;
}

function withTenantList(store: StoreV1, tenantId: string, list: Submission[]): StoreV1 {
  return {
    ...store,
    byTenant: { ...store.byTenant, [tenantId]: list },
  };
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

function seedForTenant(tenantId: Tenant["id"]): Submission[] {
  const now = Date.now();
  return REVIEW_QUEUE.map((r, idx) => {
    const hoursAgo = (idx + 1) * 2;
    const submittedAt = now - hoursAgo * 3_600_000;
    const isFirst = r.id === "r1";
    return {
      id: r.id,
      tenantId,
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

function localTenantList(store: StoreV1, tenantId: Tenant["id"]): Submission[] {
  const list = store.byTenant[tenantId];
  if (list !== undefined) return list;
  const seeded = seedForTenant(tenantId);
  const next = withTenantList(store, tenantId, seeded);
  if (!saveLocalStore(next)) return seeded;
  return loadLocalStore().byTenant[tenantId] ?? seeded;
}

function snapshotList(tenantId: Tenant["id"], list: Submission[]): Submission[] {
  const cached = listSnapshotCache.get(tenantId);
  if (cached && cached.version === storeVersion) {
    return cached.snapshot;
  }
  const snapshot = [...list].sort((a, b) => b.submittedAt - a.submittedAt);
  listSnapshotCache.set(tenantId, { version: storeVersion, snapshot });
  return snapshot;
}

export function listSubmissions(tenantId: Tenant["id"]): Submission[] {
  if (isRemotePersistence()) {
    ensureRemoteFetch(tenantId);
    return snapshotList(tenantId, remoteList(tenantId));
  }
  const store = loadLocalStore();
  return snapshotList(tenantId, localTenantList(store, tenantId));
}

export function getSubmission(tenantId: Tenant["id"], id: string): Submission | undefined {
  if (isRemotePersistence()) {
    ensureRemoteFetch(tenantId);
    return remoteList(tenantId).find((s) => s.id === id);
  }
  const store = loadLocalStore();
  return localTenantList(store, tenantId).find((s) => s.id === id);
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

function replaceRemote(tenantId: Tenant["id"], id: string, row: Submission): void {
  const list = remoteList(tenantId);
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return;
  markLocalWrite(id);
  const next = [...list];
  next[idx] = mergeRow(list[idx], row);
  setRemoteList(tenantId, next);
}

/** 提出 1 件を取り直してキャッシュに重ねる (事後確認の操作のあとなど)。 */
export async function refreshSubmission(
  tenantId: Tenant["id"],
  id: string,
): Promise<Submission | undefined> {
  if (!isRemotePersistence()) return getSubmission(tenantId, id);
  try {
    const row = await fetchSubmissionById(id);
    replaceRemote(tenantId, id, row);
    return remoteList(tenantId).find((s) => s.id === id);
  } catch (err) {
    console.error("[submissions-store] refresh failed", err);
    return undefined;
  }
}

/** 409 のときは講師のキャッシュを最新化してから知らせる (古いコードを表示し続けない)。 */
async function refreshAfterConflict(tenantId: Tenant["id"], id: string): Promise<void> {
  try {
    replaceRemote(tenantId, id, await fetchSubmissionById(id));
  } catch (err) {
    console.error("[submissions-store] conflict refresh failed", err);
  }
}

async function persistRemotePatch(
  tenantId: Tenant["id"],
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
    const list = remoteList(tenantId);
    const idx = list.findIndex((s) => s.id === id);
    if (idx >= 0) {
      const next = [...list];
      next[idx] = saved;
      setRemoteList(tenantId, next);
    }
    return saved;
  } catch (err) {
    if (remotePatchGen.get(id) === nextGen) {
      console.error("[submissions-store] remote patch failed", err);
      replaceRemote(tenantId, id, rollback);
    }
    if (err instanceof ApiClientError && err.status === 409) {
      await refreshAfterConflict(tenantId, id);
      throw new SubmissionConflictError(err.message);
    }
    return undefined;
  } finally {
    if (remotePatchGen.get(id) === nextGen) patchesInFlight.delete(id);
    markLocalWrite(id);
  }
}

export async function updateSubmission(
  tenantId: Tenant["id"],
  id: string,
  patch: Partial<Submission>,
  options: { expectUndecided?: boolean } = {},
): Promise<Submission | undefined> {
  if (isRemotePersistence()) {
    const list = remoteList(tenantId);
    const idx = list.findIndex((s) => s.id === id);
    if (idx < 0) return undefined;
    const before = list[idx];
    if (!before) return undefined;
    const updated = { ...before, ...patch };
    const next = list.map((s, i) => (i === idx ? updated : s));
    setRemoteList(tenantId, next);
    return persistRemotePatch(tenantId, id, patch, before, options);
  }

  const store = loadLocalStore();
  const list = localTenantList(store, tenantId);
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return undefined;
  const updated = { ...list[idx], ...patch };
  const newList = list.map((s, i) => (i === idx ? updated : s));
  if (!saveLocalStore(withTenantList(store, tenantId, newList))) return undefined;
  return updated;
}

export function createSubmission(
  tenantId: Tenant["id"],
  input: Omit<
    Submission,
    | "id"
    | "tenantId"
    | "submittedAt"
    | "status"
    | "aiReady"
    | "aiSuggestions"
    | "rubric"
    | "reviewNotes"
    | "verdict"
    | "attempt"
    | "priority"
  > & { priority?: Submission["priority"]; attempt?: number },
): Submission | null {
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

  const store = loadLocalStore();
  const list = localTenantList(store, tenantId);
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}`;
  const submission: Submission = {
    id,
    tenantId,
    submittedAt: Date.now(),
    status: "pending",
    aiReady: false,
    aiSuggestions: [],
    rubric: [],
    reviewNotes: "",
    verdict: null,
    ...base,
  };
  const newList = [submission, ...list];
  if (!saveLocalStore(withTenantList(store, tenantId, newList))) return null;
  return submission;
}

export async function createSubmissionAsync(
  tenantId: Tenant["id"],
  input: Omit<
    Submission,
    | "id"
    | "tenantId"
    | "submittedAt"
    | "status"
    | "aiReady"
    | "aiSuggestions"
    | "rubric"
    | "reviewNotes"
    | "verdict"
    | "attempt"
    | "priority"
  > & { priority?: Submission["priority"]; attempt?: number },
): Promise<Submission | null> {
  const base = {
    ...input,
    priority: input.priority ?? "normal",
    attempt: input.attempt ?? 1,
  };

  if (!isRemotePersistence()) {
    return createSubmission(tenantId, input);
  }

  try {
    const created = await insertSubmission(tenantId, toInsertPayload(base));
    markLocalWrite(created.id);
    // 同一課題の未添削がある場合、 サーバは既存行を upsert して返す (Issue #9)。
    // 素直に先頭へ足すと同じ id が 2 つ並ぶので、 id で置き換える。
    setRemoteList(tenantId, [created, ...remoteList(tenantId).filter((s) => s.id !== created.id)]);
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
  tenantId: Tenant["id"],
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
    tenantId,
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
export function countPending(tenantId: Tenant["id"]): number {
  if (isRemotePersistence()) {
    ensureRemoteFetch(tenantId);
    return remoteList(tenantId).filter(needsHumanReview).length;
  }
  const store = loadLocalStore();
  return localTenantList(store, tenantId).filter(needsHumanReview).length;
}

export function subscribeSubmissions(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      localCache = null;
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
