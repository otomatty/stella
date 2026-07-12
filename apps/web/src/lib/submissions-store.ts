/**
 * 提出物ストア (Issue #8 — 講師添削ワークフロー)。
 *
 * - バックエンド未設定: localStorage + fixtures シード (デモ / Tweaks)
 * - バックエンド設定済み: `submissions` テーブル (RLS)。 楽観的更新 + 非同期永続化
 */

import type { Submission, ReviewVerdict } from "@falcon/shared/review/types";
import {
  REVIEW_QUEUE,
  SUBMITTED_CODE,
  AI_SUGGESTIONS,
  RUBRIC,
} from "@/data/fixtures";
import type { Tenant } from "@/data/types";
import { isBackendConfigured } from "@/lib/backend";
import {
  fetchSubmissionsForTenant,
  insertSubmission,
  patchSubmission,
  type InsertSubmissionInput,
  type SubmissionPatch,
} from "@/lib/submissions-api";

const STORAGE_KEY = "lms_submissions_v1";

type StoreV1 = {
  version: 1;
  byTenant: Record<string, Submission[]>;
};

let localCache: StoreV1 | null = null;
let storeVersion = 0;
const listeners = new Set<() => void>();
const listSnapshotCache = new Map<
  string,
  { version: number; snapshot: Submission[] }
>();

/** バックエンドモード: テナント別インメモリキャッシュ */
const remoteByTenant = new Map<string, Submission[]>();
type RemoteFetchStatus = "idle" | "loading" | "success" | "error";
const remoteFetchStatus = new Map<string, RemoteFetchStatus>();
const remotePatchGen = new Map<string, number>();

function useRemotePersistence(): boolean {
  return isBackendConfigured();
}

function emit() {
  storeVersion += 1;
  listSnapshotCache.clear();
  listeners.forEach((fn) => fn());
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
  if (!useRemotePersistence()) return;
  const status = remoteFetchStatus.get(tenantId) ?? "idle";
  if (status === "loading" || status === "success") return;

  remoteFetchStatus.set(tenantId, "loading");
  void fetchSubmissionsForTenant(tenantId)
    .then((list) => {
      remoteFetchStatus.set(tenantId, "success");
      setRemoteList(tenantId, list);
    })
    .catch((err) => {
      remoteFetchStatus.set(tenantId, "error");
      console.error("[submissions-store] remote fetch failed", err);
    });
}

function toInsertPayload(
  base: InsertSubmissionInput & {
    studentName: string;
    studentInitials: string;
    avatarTone: Submission["avatarTone"];
  },
): InsertSubmissionInput {
  return {
    courseTitle: base.courseTitle,
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

function withTenantList(
  store: StoreV1,
  tenantId: string,
  list: Submission[],
): StoreV1 {
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
      courseTitle: r.course,
      assignmentTitle: r.assignment,
      codeLines: isFirst
        ? [...SUBMITTED_CODE]
        : [`// ${r.assignment} — ${r.student}`, "// (デモ提出コード)", ""],
      submittedAt,
      status: "pending" as const,
      priority: r.priority,
      attempt: r.assignment.includes("再提出") ? 2 : 1,
      aiReady: r.aiReady,
      aiSuggestions:
        isFirst && r.aiReady ? AI_SUGGESTIONS.map((s) => ({ ...s })) : [],
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

function snapshotList(
  tenantId: Tenant["id"],
  list: Submission[],
): Submission[] {
  const cached = listSnapshotCache.get(tenantId);
  if (cached && cached.version === storeVersion) {
    return cached.snapshot;
  }
  const snapshot = [...list].sort((a, b) => b.submittedAt - a.submittedAt);
  listSnapshotCache.set(tenantId, { version: storeVersion, snapshot });
  return snapshot;
}

export function listSubmissions(tenantId: Tenant["id"]): Submission[] {
  if (useRemotePersistence()) {
    ensureRemoteFetch(tenantId);
    return snapshotList(tenantId, remoteList(tenantId));
  }
  const store = loadLocalStore();
  return snapshotList(tenantId, localTenantList(store, tenantId));
}

export function getSubmission(
  tenantId: Tenant["id"],
  id: string,
): Submission | undefined {
  if (useRemotePersistence()) {
    ensureRemoteFetch(tenantId);
    return remoteList(tenantId).find((s) => s.id === id);
  }
  const store = loadLocalStore();
  return localTenantList(store, tenantId).find((s) => s.id === id);
}

function persistRemotePatch(
  tenantId: Tenant["id"],
  id: string,
  patch: Partial<Submission>,
  rollback: Submission,
): void {
  const nextGen = (remotePatchGen.get(id) ?? 0) + 1;
  remotePatchGen.set(id, nextGen);
  const apiPatch = toSubmissionPatch(patch);
  void patchSubmission(id, apiPatch)
    .then((saved) => {
      if (remotePatchGen.get(id) !== nextGen) return;
      const list = remoteList(tenantId);
      const idx = list.findIndex((s) => s.id === id);
      if (idx < 0) return;
      const next = [...list];
      next[idx] = saved;
      setRemoteList(tenantId, next);
    })
    .catch((err) => {
      if (remotePatchGen.get(id) !== nextGen) return;
      console.error("[submissions-store] remote patch failed", err);
      const list = remoteList(tenantId);
      const idx = list.findIndex((s) => s.id === id);
      if (idx < 0) return;
      const next = [...list];
      next[idx] = rollback;
      setRemoteList(tenantId, next);
    });
}

export function updateSubmission(
  tenantId: Tenant["id"],
  id: string,
  patch: Partial<Submission>,
): Submission | undefined {
  if (useRemotePersistence()) {
    const list = remoteList(tenantId);
    const idx = list.findIndex((s) => s.id === id);
    if (idx < 0) return undefined;
    const before = list[idx];
    const updated = { ...before, ...patch };
    const next = list.map((s, i) => (i === idx ? updated : s));
    setRemoteList(tenantId, next);
    persistRemotePatch(tenantId, id, patch, before);
    return updated;
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
  if (useRemotePersistence()) {
    console.warn(
      "[submissions-store] createSubmission called in backend mode; use createSubmissionAsync",
    );
    return null;
  }

  const store = loadLocalStore();
  const list = localTenantList(store, tenantId);
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `sub-${Date.now()}`;
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

  if (!useRemotePersistence()) {
    return createSubmission(tenantId, input);
  }

  try {
    const created = await insertSubmission(
      tenantId,
      toInsertPayload(base),
    );
    setRemoteList(tenantId, [created, ...remoteList(tenantId)]);
    return created;
  } catch (err) {
    console.error("[submissions-store] remote insert failed", err);
    return null;
  }
}

export function finalizeReview(
  tenantId: Tenant["id"],
  id: string,
  verdict: ReviewVerdict,
  patch: {
    reviewNotes: string;
    aiSuggestions: Submission["aiSuggestions"];
    rubric: Submission["rubric"];
  },
): Submission | undefined {
  const status =
    verdict === "pass" ? "passed" : verdict === "fail" ? "failed" : "resubmit";
  return updateSubmission(tenantId, id, {
    ...patch,
    verdict,
    status,
  });
}

export function formatSubmittedAt(ms: number): string {
  return relativeSubmittedAt(ms);
}

export function countPending(tenantId: Tenant["id"]): number {
  if (useRemotePersistence()) {
    ensureRemoteFetch(tenantId);
    return remoteList(tenantId).filter((s) => s.status === "pending").length;
  }
  const store = loadLocalStore();
  return localTenantList(store, tenantId).filter((s) => s.status === "pending")
    .length;
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
